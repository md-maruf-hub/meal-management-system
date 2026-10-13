import bcrypt from 'bcryptjs';

/**
 * Returns plain text password directly (no hashing), allowing
 * manual viewing and editing directly in the Google Sheet / database.
 */
export function hashPassword(password: string): string {
  return String(password || '').trim();
}

/**
 * Compares plain text password directly, with backward compatibility
 * for legacy bcrypt hashes if present.
 */
export function comparePassword(password: string, stored: string): boolean {
  if (!stored) return false;
  const cleanPass = String(password || '').trim();
  const cleanStored = String(stored || '').trim();

  // If the stored value is an older BCrypt hash, support it for backward compatibility
  if (cleanStored.startsWith('$2a$') || cleanStored.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(cleanPass, cleanStored);
    } catch (e) {
      return cleanPass === cleanStored;
    }
  }

  // Plain text comparison
  return cleanPass === cleanStored;
}
