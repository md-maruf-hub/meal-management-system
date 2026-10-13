import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { fetchGasData, getGasUrl } from '../../../../lib/db/google-sheets';
import { SecurityToken } from '../../../../lib/types';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = await getDatabase();
    const user = db.members.find((m) => m.email && m.email.toLowerCase() === cleanEmail);

    if (!user) {
      return NextResponse.json({ error: 'No member registered with this email address.' }, { status: 404 });
    }

    // 1. Generate OTP Code first on Next.js server to ensure perfect synchronization
    const code = Math.floor(100000 + Math.random() * 900000).toString();
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

    // 2. Call GAS to send email and write this exact code to Google Sheets
    const gasUrl = getGasUrl();
    if (gasUrl) {
      try {
        const gasRes: any = await fetchGasData('sendForgotPasswordOTP', { 
          email: cleanEmail,
          code: code
        });
        if (gasRes && gasRes.success) {
          return NextResponse.json({ 
            success: true, 
            message: 'Verification OTP code sent to your email.',
            code // Keep code in response so local offline testing works
          });
        }
      } catch (err: any) {
        console.warn("GAS email OTP send failed, using local offline fallback code:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verification OTP Code generated: ${code}`,
      code,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
