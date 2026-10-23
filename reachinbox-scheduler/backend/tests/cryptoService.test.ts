import { describe, it, expect } from 'vitest';
import { CryptoService } from '../src/services/cryptoService';

describe('CryptoService', () => {
  it('should encrypt and decrypt plaintext symmetrically', () => {
    const secret = 'super-secret-smtp-password-12345';
    const encrypted = CryptoService.encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3); // iv:tag:data

    const decrypted = CryptoService.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should return empty string on empty input or invalid ciphertext', () => {
    expect(CryptoService.encrypt('')).toBe('');
    expect(CryptoService.decrypt('')).toBe('');
    expect(CryptoService.decrypt('invalid:format')).toBe('');
    expect(CryptoService.decrypt('corrupt:data:payload')).toBe('');
  });
});
