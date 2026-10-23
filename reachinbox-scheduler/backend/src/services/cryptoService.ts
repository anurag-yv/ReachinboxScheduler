import crypto from 'crypto';
import { ENV } from '../config/env';

/**
 * Service to encrypt and decrypt sensitive fields (SMTP credentials, OAuth access tokens)
 * using AES-256-GCM authenticated encryption.
 */
export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  private static getKey(): Buffer {
    let raw = ENV.ENCRYPTION_KEY;
    if (raw.length === 64) {
      return Buffer.from(raw, 'hex');
    }
    // Fallback: derive 32 bytes using SHA-256
    return crypto.createHash('sha256').update(raw).digest();
  }

  public static encrypt(plainText: string): string {
    if (!plainText) return '';
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.getKey(), iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  public static decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.getKey(), iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: any) {
      console.error('[CryptoService] Decryption failed:', err.message);
      return '';
    }
  }
}
