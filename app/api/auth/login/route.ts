import { NextResponse } from 'next/server';
import { getDatabase, syncMembersFromGoogleSheet } from '../../../../lib/db';
import { createToken, findMatchingMember } from '../../../../lib/auth';
import { comparePassword } from '../../../../lib/password';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { phoneOrId, password } = await request.json();
    if (!phoneOrId || !password) {
      return NextResponse.json({ error: 'ফোন নম্বর, মেম্বার আইডি বা ইমেইল এবং পাসওয়ার্ড প্রদান করুন।' }, { status: 400 });
    }

    const inputStr = String(phoneOrId).trim();

    // 1. First check local virtual DB
    let db = await getDatabase();
    let user = findMatchingMember(db.members, inputStr);

    const isApprovedStatus = (status?: string, role?: string) => {
      const s = String(status || '').trim().toUpperCase();
      return s === 'APPROVED' || s === 'ACTIVE' || role === 'SUPER_ADMIN';
    };

    const isInitialValid = Boolean(
      user &&
      isApprovedStatus(user.status, user.role) &&
      user.passwordHash &&
      comparePassword(password, user.passwordHash)
    );

    // 2. If not found, not approved, or password mismatch:
    // DIRECTLY sync with Google Sheets Member sheet so live changes are immediately recognized!
    if (!isInitialValid) {
      try {
        db = await syncMembersFromGoogleSheet();
        user = findMatchingMember(db.members, inputStr);
      } catch (syncErr) {
        console.warn('Direct Google Sheet verification sync warning:', syncErr);
      }
    }

    // 3. User existence check
    if (!user) {
      return NextResponse.json(
        { error: 'এই ফোন নম্বর, মেম্বার আইডি বা ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    // 4. Approval status check
    const statusUpper = String(user.status || '').trim().toUpperCase();
    if (user.role !== 'SUPER_ADMIN' && statusUpper !== 'APPROVED' && statusUpper !== 'ACTIVE') {
      if (statusUpper === 'PENDING') {
        return NextResponse.json(
          { error: 'আপনার অ্যাকাউন্টটি এখনো অনুমোদিত হয়নি। অনুগ্রহ করে অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।' },
          { status: 403 }
        );
      }
      if (statusUpper === 'REJECTED') {
        return NextResponse.json(
          { error: 'আপনার অ্যাকাউন্ট আবেদনটি অ্যাডমিন দ্বারা বাতিল করা হয়েছে।' },
          { status: 403 }
        );
      }
      if (statusUpper === 'INACTIVE') {
        return NextResponse.json(
          { error: 'আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে মেস ম্যানেজারের সাথে যোগাযোগ করুন।' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'আপনার অ্যাকাউন্টের স্ট্যাটাস সক্রিয় নয়।' },
        { status: 403 }
      );
    }

    // 5. Password verification
    const isPassCorrect = Boolean(user.passwordHash && comparePassword(password, user.passwordHash));
    if (!isPassCorrect) {
      return NextResponse.json(
        { error: 'ভুল পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' },
        { status: 401 }
      );
    }

    // 6. Generate session user
    const sessionUser = {
      id: user.id,
      memberId: user.memberId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      roomNo: user.roomNo,
    };

    // 7. Generate long-lived token (10 years)
    const token = await createToken(sessionUser);

    // 8. Set persistent device cookie (10 years) until manual logout
    const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10; // 315,360,000 seconds
    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('mill_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TEN_YEARS_SECONDS,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' }, { status: 500 });
  }
}
