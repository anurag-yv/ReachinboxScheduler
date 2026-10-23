import Redis from 'ioredis';
import { IRateLimitService, RateLimitReservationResult, HourlyQuotaResult } from '../types';
import { redisClient } from '../config/redis';

export class RedisRateLimitService implements IRateLimitService {
  private redis: Redis;

  // Lua script for distributed send spacing across instances/workers
  private static readonly SPACING_LUA = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local minDelay = tonumber(ARGV[2])

    local lastScheduled = redis.call('GET', key)
    local nextAllowed = now

    if lastScheduled then
      local lastTime = tonumber(lastScheduled)
      if (lastTime + minDelay) > now then
        nextAllowed = lastTime + minDelay
      end
    end

    redis.call('SET', key, nextAllowed, 'EX', 3600)
    local delay = nextAllowed - now
    return delay
  `;

  // Lua script for atomic hourly quota check & increment
  private static readonly HOURLY_QUOTA_LUA = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local ttl = tonumber(ARGV[2])

    local current = redis.call('INCR', key)
    if current == 1 then
      redis.call('EXPIRE', key, ttl)
    end

    if current > limit then
      redis.call('DECR', key)
      return { 0, current - 1 }
    else
      return { 1, current }
    end
  `;

  constructor(customRedis?: Redis) {
    this.redis = customRedis || redisClient;
  }

  /**
   * Reserves a distributed send spacing slot.
   * Guarantees at least minDelaySeconds between sends for this sender.
   */
  async reserveSendSpacing(senderId: string, minDelaySeconds: number): Promise<RateLimitReservationResult> {
    const key = `email-spacing:${senderId}`;
    const now = Date.now();
    const minDelayMs = minDelaySeconds * 1000;

    try {
      const delayMs = (await this.redis.eval(
        RedisRateLimitService.SPACING_LUA,
        1,
        key,
        now.toString(),
        minDelayMs.toString()
      )) as number;

      return {
        allowed: delayMs <= 0,
        delayMs: Math.max(0, delayMs),
      };
    } catch (err: any) {
      // If Redis connection is down, fail open safely with 0 delay to avoid permanently blocking sends
      console.warn('[RateLimitService] Redis spacing check failed, proceeding safely:', err.message);
      return { allowed: true, delayMs: 0 };
    }
  }

  /**
   * Atomically checks and reserves a send slot within the current UTC hour window.
   * Window key format: email-rate:{senderId}:{YYYYMMDDHH}
   */
  async checkAndConsumeHourlyQuota(senderId: string, hourlyLimit: number): Promise<HourlyQuotaResult> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');

    const windowKey = `email-rate:${senderId}:${year}${month}${day}${hour}`;
    
    // Calculate seconds remaining until next UTC hour
    const nextHourUtc = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 5, 0));
    const retryAfterSeconds = Math.max(10, Math.ceil((nextHourUtc.getTime() - now.getTime()) / 1000));
    const ttlSeconds = retryAfterSeconds + 3600; // Keep key alive for at least 1 extra hour

    try {
      const result = (await this.redis.eval(
        RedisRateLimitService.HOURLY_QUOTA_LUA,
        1,
        windowKey,
        hourlyLimit.toString(),
        ttlSeconds.toString()
      )) as [number, number];

      const allowed = result[0] === 1;
      const currentCount = result[1];

      return {
        allowed,
        currentCount,
        limit: hourlyLimit,
        retryAfterSeconds,
        windowKey,
      };
    } catch (err: any) {
      console.warn('[RateLimitService] Redis hourly quota check failed, allowing safely:', err.message);
      return {
        allowed: true,
        currentCount: 1,
        limit: hourlyLimit,
        retryAfterSeconds: 0,
        windowKey,
      };
    }
  }
}
