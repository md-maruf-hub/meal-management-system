import { NextResponse } from 'next/server';
import { getDatabase, saveLocalDatabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';
import { MealRequest } from '../../../../lib/types';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.split('; ')
      .find((row) => row.startsWith('mill_session='))?.split('=')[1];

    const sessionUser = token ? await verifyToken(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // optional specific date e.g. "2026-09-26"
    const yearMonth = searchParams.get('yearMonth') || (date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7));

    const db = await getDatabase();
    let requests = (db.mealRequests || []).filter(
      (r) => r.memberId === sessionUser.id && (date ? r.date === date : r.yearMonth === yearMonth)
    );

    // If date is queried and member hasn't explicitly set preferences for this date,
    // inherit their latest previous preferences (including guest meals) as requested by user
    if (date && !requests.some((r) => r.date === date)) {
      const prevReq = (db.mealRequests || [])
        .filter((r) => r.memberId === sessionUser.id && r.date < date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (prevReq) {
        const gb = Number(prevReq.guestBreakfast) || 0;
        const gl = Number(prevReq.guestLunch) || 0;
        const gd = Number(prevReq.guestDinner) || 0;
        const totalG =
          prevReq.guestBreakfast !== undefined || prevReq.guestLunch !== undefined || prevReq.guestDinner !== undefined
            ? gb + gl + gd
            : Number(prevReq.guestCount) || 0;

        const inheritedReq: MealRequest = {
          id: `inherited-${date}-${sessionUser.id}`,
          memberId: sessionUser.id,
          yearMonth,
          date,
          day: parseInt(date.substring(8, 10), 10),
          breakfast: Boolean(prevReq.breakfast),
          lunch: Boolean(prevReq.lunch),
          dinner: Boolean(prevReq.dinner),
          guestBreakfast: gb,
          guestLunch: gl,
          guestDinner: gd,
          guestCount: totalG,
          note: prevReq.note || '',
          isInherited: true,
          updatedAt: prevReq.updatedAt,
        };
        requests = [inheritedReq];
      }
    }

    const locks = (db.dailyMealLocks || []).filter(
      (l) => date ? l.date === date : l.yearMonth === yearMonth
    ).map((l) => {
      const bLocked = Boolean(l.breakfastLocked ?? l.isLocked);
      const lLocked = Boolean(l.lunchLocked ?? l.isLocked);
      const dLocked = Boolean(l.dinnerLocked ?? l.isLocked);
      return {
        ...l,
        breakfastLocked: bLocked,
        lunchLocked: lLocked,
        dinnerLocked: dLocked,
        isLocked: Boolean(l.isLocked || (bLocked && lLocked && dLocked)),
      };
    });

    const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
    const isMonthClosed = monthLock?.status === 'CLOSED';

    return NextResponse.json({
      success: true,
      requests,
      locks,
      isMonthClosed,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('cookie')?.split('; ')
      .find((row) => row.startsWith('mill_session='))?.split('=')[1];

    const sessionUser = token ? await verifyToken(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, breakfast, lunch, dinner, guestCount, guestBreakfast, guestLunch, guestDinner, note } = await request.json();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required.' }, { status: 400 });
    }

    const yearMonth = date.substring(0, 7);
    const day = parseInt(date.substring(8, 10), 10);

    const db = await getDatabase();

    // 1. Check if the month is closed
    const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
    if (monthLock && monthLock.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'এই মাসটি ইতোমধ্যে বন্ধ (CLOSED) করা হয়েছে। মিল পরিবর্তন করা যাবে না।' },
        { status: 403 }
      );
    }

    // 2. Check if the manager has locked any sessions for this date
    const dailyLock = (db.dailyMealLocks || []).find((l) => l.date === date);
    const isBreakfastLocked = Boolean(dailyLock?.breakfastLocked ?? dailyLock?.isLocked);
    const isLunchLocked = Boolean(dailyLock?.lunchLocked ?? dailyLock?.isLocked);
    const isDinnerLocked = Boolean(dailyLock?.dinnerLocked ?? dailyLock?.isLocked);
    const isAllLocked = Boolean(dailyLock?.isLocked || (isBreakfastLocked && isLunchLocked && isDinnerLocked));

    if (isAllLocked) {
      return NextResponse.json(
        { error: '🔒 ম্যানেজার রান্নার জন্য এই তারিখের সব বেলার মিল লক করেছেন। এখন আর পরিবর্তন করা সম্ভব নয়।' },
        { status: 403 }
      );
    }

    if (!db.mealRequests) db.mealRequests = [];

    const reqId = `req-${date}-${sessionUser.id}`;
    const existingIndex = db.mealRequests.findIndex(
      (r) => r.memberId === sessionUser.id && r.date === date
    );

    const directReq = existingIndex >= 0 ? db.mealRequests[existingIndex] : null;
    const prevReq = !directReq
      ? (db.mealRequests || [])
          .filter((r) => r.memberId === sessionUser.id && r.date < date)
          .sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;
    const baseReq = directReq || prevReq;

    const gB = Math.max(0, Number(guestBreakfast) || 0);
    const gL = Math.max(0, Number(guestLunch) || 0);
    const gD = Math.max(0, Number(guestDinner) || 0);

    // If a session is locked, its value CANNOT be modified by the member; keep existing/base value
    const finalBreakfast = isBreakfastLocked ? (baseReq ? Boolean(baseReq.breakfast) : true) : Boolean(breakfast);
    const finalGuestBreakfast = isBreakfastLocked ? (baseReq ? (Number(baseReq.guestBreakfast) || 0) : 0) : gB;

    const finalLunch = isLunchLocked ? (baseReq ? Boolean(baseReq.lunch) : true) : Boolean(lunch);
    const finalGuestLunch = isLunchLocked ? (baseReq ? (Number(baseReq.guestLunch) || 0) : 0) : gL;

    const finalDinner = isDinnerLocked ? (baseReq ? Boolean(baseReq.dinner) : true) : Boolean(dinner);
    const finalGuestDinner = isDinnerLocked ? (baseReq ? (Number(baseReq.guestDinner) || 0) : 0) : gD;

    const totalG = finalGuestBreakfast + finalGuestLunch + finalGuestDinner;

    const updatedRequest: MealRequest = {
      id: reqId,
      memberId: sessionUser.id,
      yearMonth,
      date,
      day,
      breakfast: finalBreakfast,
      lunch: finalLunch,
      dinner: finalDinner,
      guestCount: totalG,
      guestBreakfast: finalGuestBreakfast,
      guestLunch: finalGuestLunch,
      guestDinner: finalGuestDinner,
      note: note ? String(note).trim() : '',
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      db.mealRequests[existingIndex] = updatedRequest;
    } else {
      db.mealRequests.push(updatedRequest);
    }

    // Member booking stays strictly on the site as requested (not synced to Google Sheets or db.meals)
    await saveLocalDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'মিল বুকিং সাইটে সফলভাবে সংরক্ষিত হয়েছে।',
      request: updatedRequest,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
