import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { fetchGasData, getGasUrl } from '../../../../lib/db/google-sheets';
import { SecurityToken } from '../../../../lib/types';

export async function POST(request: Request) {
  const genericResponse = () =>
    NextResponse.json({
      success: true,
      message: 'If an account exists for this email, password reset instructions will be sent.',
    });

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = await getDatabase();
    const user = db.members.find((m) => m.email && m.email.toLowerCase() === cleanEmail);

    if (!user) {
      return genericResponse();
    }

    const code = randomInt(100000, 1000000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    const newToken: SecurityToken = {
      id: `sec-${Date.now()}`,
      email: cleanEmail,
      code,
      createdAt: now.toISOString(),
      expiresAt,
      status: 'PENDING',
    };

    if (!db.securityTokens) db.securityTokens = [];
    db.securityTokens.push(newToken);
    await saveDatabase(db);

    // Send the OTP through GAS; never return it through this API.
    const gasUrl = getGasUrl();
    if (gasUrl) {
      try {
        const gasRes: any = await fetchGasData('sendForgotPasswordOTP', {
          email: cleanEmail,
          code,
        });
        if (gasRes && gasRes.success) {
          return genericResponse();
        }
      } catch (err) {
        console.warn('GAS email OTP send failed.');
      }
    }

    newToken.status = 'EXPIRED';
    await saveDatabase(db);
    return genericResponse();
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
