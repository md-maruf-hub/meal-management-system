import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/db';
import { createToken } from '../../../../lib/auth';
import { comparePassword } from '../../../../lib/password';

export async function POST(request: Request) {
  try {
    const { phoneOrId, password } = await request.json();
    if (!phoneOrId || !password) {
      return NextResponse.json({ error: 'Phone/Email/Member ID and Password are required.' }, { status: 400 });
    }

    const inputStr = String(phoneOrId).trim();
    const db = await getDatabase();

    const user = db.members.find((m) => {
      const phoneStr = String(m.phone || '').trim();
      const memberIdStr = String(m.memberId || '').trim();
      const emailStr = String(m.email || '').trim().toLowerCase();

      const isPhoneMatch =
        phoneStr === inputStr ||
        phoneStr === inputStr.replace(/^0/, '') ||
        (`0${phoneStr}`) === inputStr;

      const isIdMatch = memberIdStr.toLowerCase() === inputStr.toLowerCase();
      const isEmailMatch = emailStr.length > 0 && emailStr === inputStr.toLowerCase();

      return (isPhoneMatch || isIdMatch || isEmailMatch) && (m.status === 'APPROVED' || m.role === 'SUPER_ADMIN');
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials or account pending approval.' }, { status: 401 });
    }

    const isValid = comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      memberId: user.memberId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      roomNo: user.roomNo,
    };

    const token = await createToken(sessionUser);

    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('mill_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
