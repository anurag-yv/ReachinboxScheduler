import { describe, it, expect } from 'vitest';
import { RecipientParser } from '../src/services/recipientParser';

describe('RecipientParser', () => {
  it('should validate email addresses accurately', () => {
    expect(RecipientParser.isValidEmail('test@example.com')).toBe(true);
    expect(RecipientParser.isValidEmail('user.name+tag@domain.co.in')).toBe(true);
    expect(RecipientParser.isValidEmail('invalid-email')).toBe(false);
    expect(RecipientParser.isValidEmail('@nodomain.com')).toBe(false);
    expect(RecipientParser.isValidEmail('test@')).toBe(false);
    expect(RecipientParser.isValidEmail('')).toBe(false);
  });

  it('should parse standard CSV with header "email"', () => {
    const csvContent = `email,name
alice@company.com,Alice
bob@company.com,Bob
charlie@company.com,Charlie`;

    const result = RecipientParser.parseFile(csvContent);
    expect(result.validRecipients).toEqual([
      'alice@company.com',
      'bob@company.com',
      'charlie@company.com',
    ]);
    expect(result.invalidEntriesCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });

  it('should remove duplicates and trim whitespace', () => {
    const csvContent = `email
  ALICE@company.com  
alice@company.com
bob@company.com
BOB@company.com
invalid-entry
`;

    const result = RecipientParser.parseFile(csvContent);
    expect(result.validRecipients).toEqual([
      'alice@company.com',
      'bob@company.com',
    ]);
    expect(result.duplicateCount).toBe(2);
    expect(result.invalidEntriesCount).toBe(1);
  });

  it('should parse plain TXT files with one email per line', () => {
    const txtContent = `john@example.com
jane@example.com
not-an-email
john@example.com`;

    const result = RecipientParser.parseFile(txtContent);
    expect(result.validRecipients).toEqual([
      'john@example.com',
      'jane@example.com',
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidEntriesCount).toBe(1);
  });
});
