import { parse } from 'csv-parse/sync';

export interface ParseRecipientsResult {
  validRecipients: string[];
  invalidEntriesCount: number;
  duplicateCount: number;
  totalParsed: number;
}

export class RecipientParser {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  public static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length > 254) return false;
    return this.EMAIL_REGEX.test(trimmed);
  }

  /**
   * Parses raw file buffer or string (CSV or TXT format)
   */
  public static parseFile(content: string | Buffer): ParseRecipientsResult {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    const rawTokens: string[] = [];

    // Attempt CSV parsing first
    try {
      const records = parse(text, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as string[][];

      if (records.length > 0) {
        // Detect header row if present
        let emailColumnIndex = 0;
        const firstRow = records[0].map((c) => c.toLowerCase().trim());
        const headerIndex = firstRow.indexOf('email');

        let startRow = 0;
        if (headerIndex !== -1) {
          emailColumnIndex = headerIndex;
          startRow = 1; // Skip header
        }

        for (let i = startRow; i < records.length; i++) {
          const row = records[i];
          if (row[emailColumnIndex]) {
            rawTokens.push(row[emailColumnIndex]);
          } else if (row.length > 0) {
            // Check any column in row that looks like an email
            for (const col of row) {
              if (col.trim()) {
                rawTokens.push(col.trim());
                break;
              }
            }
          }
        }
      }
    } catch {
      // Fallback: Line-by-line parsing for TXT files
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.toLowerCase().startsWith('email')) {
          rawTokens.push(trimmed);
        }
      }
    }

    const seen = new Set<string>();
    const validRecipients: string[] = [];
    let invalidEntriesCount = 0;
    let duplicateCount = 0;

    for (const token of rawTokens) {
      const cleaned = token.trim().toLowerCase();
      if (!cleaned) continue;

      if (!this.isValidEmail(cleaned)) {
        invalidEntriesCount++;
        continue;
      }

      if (seen.has(cleaned)) {
        duplicateCount++;
      } else {
        seen.add(cleaned);
        validRecipients.push(cleaned);
      }
    }

    return {
      validRecipients,
      invalidEntriesCount,
      duplicateCount,
      totalParsed: rawTokens.length,
    };
  }
}
