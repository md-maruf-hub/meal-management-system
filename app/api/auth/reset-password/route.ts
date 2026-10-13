import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { fetchGasData, getGasUrl } from '../../../../lib/db/google-sheets';
import { hashPassword } from '../../../../lib/password';

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP code, and new password are required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const passwordHash = hashPassword(newPassword);

    const gasUrl = getGasUrl();
    if (gasUrl) {
      try {
        const gasRes: any = await fetchGasData('verifyOTPAndResetPassword', {
          email: cleanEmail,
          code: cleanCode,
          newPasswordHash: passwordHash,
        });
        if (gasRes && gasRes.success) {
          // Also update local DB
          const db = await getDatabase();
          const member = db.members.find((m) => m.email && m.email.toLowerCase() === cleanEmail);
          if (member) {
            member.passwordHash = passwordHash;
            await saveDatabase(db);
          }
          return NextResponse.json({ success: true, message: 'Password reset successfully!' });
        }
      } catch (err: any) {
        console.warn("GAS reset failed, attempting local reset verification:", err);
      }
    }

    // Local fallback reset
    const db = await getDatabase();
    const tokens = db.securityTokens || [];
    const now = new Date().toISOString();

    const validToken = tokens.find(
      (st) =>
        st.email.toLowerCase() === cleanEmail &&
        st.code === cleanCode &&
        st.status === 'PENDING' &&
        st.expiresAt > now
    );

    if (!validToken) {
      return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 400 });
    }

    const member = db.members.find((m) => m.email && m.email.toLowerCase() === cleanEmail);
    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    member.passwordHash = passwordHash;
    validToken.status = 'USED';
    await saveDatabase(db);

    return NextResponse.json({ success: true, message: 'Password reset successfully!' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
