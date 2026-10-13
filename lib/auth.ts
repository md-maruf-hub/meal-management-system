import { SignJWT, jwtVerify } from 'jose';
import { AuthSession } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mill_management_jwt_secret_key_2026_super_secure'
);

export async function createToken(payload: AuthSession['user']): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
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
