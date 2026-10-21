import { SignJWT, jwtVerify } from 'jose';
import { AuthSession, Member } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mill_management_jwt_secret_key_2026_super_secure'
);

/**
 * Normalizes Bengali digits e.g. ০১৭১১০০০০০১ to 01711000001
 */
export function normalizeBengaliDigits(str: string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let res = String(str || '');
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(bengaliDigits[i], String(i));
  }
  return res;
}

/**
 * Normalizes any Bangladesh phone format to standard 11 digits: e.g. 01711000001
 * Handles:
 * - 01711000001
 * - 1711000001 (Google Sheets strips leading zero when saved as number)
 * - +8801711000001 or 8801711000001
 * - Bengali digits ০১৭১১০০০০০১
 * - Spaces and hyphens e.g. 01711-000001
 */
export function normalizePhone(raw: string): string {
  const clean = normalizeBengaliDigits(raw).replace(/\D/g, '');
  if (!clean) return '';
  let num = clean;
  if (num.startsWith('880')) {
    num = num.substring(2); // 88017... -> 017...
  } else if (num.startsWith('88') && num.length >= 12) {
    num = num.substring(2);
  }
  if (num.length === 10 && num.startsWith('1')) {
    num = `0${num}`;
  }
  return num;
}

/**
 * Finds a member by Phone (canonical 11-digit or stripped), Member ID, User ID, or Email.
 */
export function findMatchingMember(members: Member[], input: string): Member | undefined {
  const rawInput = String(input || '').trim();
  if (!rawInput) return undefined;

  const inputPhone = normalizePhone(rawInput);
  const inputCleanId = rawInput.replace(/[\s\-_]/g, '').toLowerCase();
  const inputEmail = rawInput.toLowerCase();

  return (members || []).find((m) => {
    // 1. Phone match
    if (inputPhone.length >= 10) {
      const mPhone = normalizePhone(m.phone || '');
      if (mPhone === inputPhone) return true;
    }

    // 2. Member ID / user ID match
    const mIdClean = String(m.memberId || '').replace(/[\s\-_]/g, '').toLowerCase();
    const uIdClean = String(m.id || '').replace(/[\s\-_]/g, '').toLowerCase();
    if (inputCleanId && (mIdClean === inputCleanId || uIdClean === inputCleanId)) {
      return true;
    }

    // 3. Email match
    if (m.email && m.email.trim().toLowerCase() === inputEmail) {
      return true;
    }

    return false;
  });
}

export async function createToken(payload: AuthSession['user']): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('3650d') // 10 years persistent device session
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthSession['user'] | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession['user'];
  } catch (error) {
    return null;
  }
}
