import { describe, it, expect, vi } from 'vitest';
import { RedisRateLimitService } from '../src/services/rateLimitService';

describe('RateLimitService', () => {
  it('should compute UTC hourly window key and retryAfterSeconds accurately', async () => {
    // Mock redis client eval call
    const mockRedis = {
      eval: vi.fn().mockImplementation((script: string, numKeys: number, key: string, limit: string) => {
        // Return allowed = 1, currentCount = 5
        return [1, 5];
      }),
    };

    const rateLimitService = new RedisRateLimitService(mockRedis as any);
    const result = await rateLimitService.checkAndConsumeHourlyQuota('sender-123', 100);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(result.limit).toBe(100);
    expect(result.windowKey).toMatch(/^email-rate:sender-123:\d{10}$/);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(3605);
  });

  it('should detect when hourly quota is exhausted and indicate deferral', async () => {
    // Return allowed = 0, currentCount = 100
    const mockRedis = {
      eval: vi.fn().mockResolvedValue([0, 100]),
    };

    const rateLimitService = new RedisRateLimitService(mockRedis as any);
    const result = await rateLimitService.checkAndConsumeHourlyQuota('sender-123', 100);

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(100);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('should reserve distributed send spacing slot via Lua evaluation', async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(2000), // 2000ms delay needed
    };

    const rateLimitService = new RedisRateLimitService(mockRedis as any);
    const result = await rateLimitService.reserveSendSpacing('sender-123', 2);

    expect(result.allowed).toBe(false);
    expect(result.delayMs).toBe(2000);
  });
});
