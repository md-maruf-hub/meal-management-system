import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, saveLocalDatabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';
import { DailyMealLock, MealEntry } from '../../../../lib/types';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.split('; ')
      .find((row) => row.startsWith('mill_session='))?.split('=')[1];

    const sessionUser = token ? await verifyToken(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const todayStr = new Date().toISOString().split('T')[0];
    const date = searchParams.get('date') || todayStr;
    const yearMonth = date.substring(0, 7);
    const day = parseInt(date.substring(8, 10), 10);

    const db = await getDatabase();

    const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
    const isMonthManager = Boolean(
      monthLock && (monthLock.managerId === sessionUser.id || monthLock.managerId === sessionUser.memberId)
    );

    if (sessionUser.role !== 'MANAGER' && sessionUser.role !== 'SUPER_ADMIN' && !isMonthManager) {
      return NextResponse.json({ error: 'Unauthorized: Manager or Admin access required' }, { status: 403 });
    }

    // 1. Check lock status
    const dailyLock = (db.dailyMealLocks || []).find((l) => l.date === date);
    const breakfastLocked = Boolean(dailyLock?.breakfastLocked ?? dailyLock?.isLocked);
    const lunchLocked = Boolean(dailyLock?.lunchLocked ?? dailyLock?.isLocked);
    const dinnerLocked = Boolean(dailyLock?.dinnerLocked ?? dailyLock?.isLocked);
    const isLocked = Boolean(dailyLock?.isLocked || (breakfastLocked && lunchLocked && dinnerLocked));

    const bValue = dailyLock?.bValue !== undefined ? Number(dailyLock.bValue) : 0.5;
    const lValue = dailyLock?.lValue !== undefined ? Number(dailyLock.lValue) : 1.0;
    const dValue = dailyLock?.dValue !== undefined ? Number(dailyLock.dValue) : 1.0;
    const gbValue = dailyLock?.gbValue !== undefined ? Number(dailyLock.gbValue) : bValue;
    const glValue = dailyLock?.glValue !== undefined ? Number(dailyLock.glValue) : lValue;
    const gdValue = dailyLock?.gdValue !== undefined ? Number(dailyLock.gdValue) : dValue;
    const hasCustomGuestWeights = Boolean(
      dailyLock?.gbValue !== undefined ||
      dailyLock?.glValue !== undefined ||
      dailyLock?.gdValue !== undefined
    );

    // 2. Active approved members (excluding Super Admin, respecting joinDate & leaveDate)
    const approvedMembers = db.members.filter((m) => {
      if (m.role === 'SUPER_ADMIN') return false;
      if (m.status !== 'APPROVED') return false;
      if (m.joinDate && date < m.joinDate) return false;
      if (m.leaveDate && date > m.leaveDate) return false;
      return true;
    });

    // 3. Match each member with their MealRequest for this date
    // 3. Match each member with their MealRequest for this date
    let totalBreakfast = 0;
    let totalBreakfastGuests = 0;
    let totalLunchRegular = 0;
    let totalLunchGuests = 0;
    let totalDinnerRegular = 0;
    let totalDinnerGuests = 0;
    let totalGuests = 0;

    const memberRequests = approvedMembers.map((m) => {
      const directReq = (db.mealRequests || []).find(
        (r) => r.memberId === m.id && r.date === date
      );

      const prevReq = !directReq
        ? (db.mealRequests || [])
            .filter((r) => r.memberId === m.id && r.date < date)
            .sort((a, b) => b.date.localeCompare(a.date))[0]
        : null;

      const req = directReq || prevReq;

      // Default to ON if no custom request was submitted
      const breakfast = req ? req.breakfast : true;
      const lunch = req ? req.lunch : true;
      const dinner = req ? req.dinner : true;
      const guestBreakfast = req ? (Number(req.guestBreakfast) || 0) : 0;
      const guestLunch = req ? (Number(req.guestLunch) || 0) : 0;
      const guestDinner = req ? (Number(req.guestDinner) || 0) : 0;
      const guestCount = req
        ? (req.guestBreakfast !== undefined || req.guestLunch !== undefined || req.guestDinner !== undefined
            ? guestBreakfast + guestLunch + guestDinner
            : (req.guestCount || 0))
        : 0;
      const note = req ? req.note : '';
      const isCustomSubmitted = Boolean(directReq);
      const isInherited = Boolean(!directReq && prevReq);

      if (breakfast) totalBreakfast += 1;
      if (lunch) totalLunchRegular += 1;
      if (dinner) totalDinnerRegular += 1;
      totalBreakfastGuests += guestBreakfast;
      totalLunchGuests += guestLunch;
      totalDinnerGuests += guestDinner;
      totalGuests += guestCount;

      return {
        memberId: m.id,
        memberCode: m.memberId,
        name: m.name,
        roomNo: m.roomNo,
        phone: m.phone,
        breakfast,
        lunch,
        dinner,
        guestBreakfast,
        guestLunch,
        guestDinner,
        guestCount,
        note,
        isCustomSubmitted,
        isInherited,
        updatedAt: req?.updatedAt,
      };
    });

    const summary = {
      date,
      yearMonth,
      day,
      totalMembers: approvedMembers.length,
      breakfast: totalBreakfast,
      breakfastGuests: totalBreakfastGuests,
      totalBreakfastCooking: totalBreakfast + totalBreakfastGuests,
      lunchRegular: totalLunchRegular,
      lunchGuests: totalLunchGuests,
      totalLunchWithGuests: totalLunchRegular + totalLunchGuests,
      dinnerRegular: totalDinnerRegular,
      dinnerGuests: totalDinnerGuests,
      totalDinnerWithGuests: totalDinnerRegular + totalDinnerGuests,
      guestCount: totalGuests,
    };

    const sheetMealsForDate = (db.meals || []).filter(
      (m) => m.yearMonth === yearMonth && m.day === day && (m.mealCount || 0) > 0
    );
    const isAddedToSheet = sheetMealsForDate.length > 0;
    const sheetTotalMealCount = Math.round(sheetMealsForDate.reduce((sum, m) => sum + (m.mealCount || 0), 0) * 10) / 10;

    return NextResponse.json({
      success: true,
      date,
      isLocked,
      isAddedToSheet,
      sheetTotalMealCount,
      breakfastLocked,
      lunchLocked,
      dinnerLocked,
      lockedBy: dailyLock?.lockedBy,
      lockedAt: dailyLock?.lockedAt,
      bValue,
      lValue,
      dValue,
      gbValue,
      glValue,
      gdValue,
      hasCustomGuestWeights,
      summary,
      membersList: memberRequests,
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
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const body = await request.json();
    const { date, action } = body;
    const bValue = body.bValue !== undefined && Number(body.bValue) >= 0 ? Number(body.bValue) : 0.5;
    const lValue = body.lValue !== undefined && Number(body.lValue) >= 0 ? Number(body.lValue) : 1.0;
    const dValue = body.dValue !== undefined && Number(body.dValue) >= 0 ? Number(body.dValue) : 1.0;
    const gbValue = body.gbValue !== undefined && Number(body.gbValue) >= 0 ? Number(body.gbValue) : bValue;
    const glValue = body.glValue !== undefined && Number(body.glValue) >= 0 ? Number(body.glValue) : lValue;
    const gdValue = body.gdValue !== undefined && Number(body.gdValue) >= 0 ? Number(body.gdValue) : dValue;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required.' }, { status: 400 });
    }

    const yearMonth = date.substring(0, 7);
    const day = parseInt(date.substring(8, 10), 10);

    const db = await getDatabase();

    const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
    const isMonthManager = Boolean(
      monthLock && (monthLock.managerId === sessionUser.id || monthLock.managerId === sessionUser.memberId)
    );

    if (sessionUser.role !== 'MANAGER' && sessionUser.role !== 'SUPER_ADMIN' && !isMonthManager) {
      return NextResponse.json({ error: 'Unauthorized: Manager or Admin access required' }, { status: 403 });
    }
    if (!db.dailyMealLocks) db.dailyMealLocks = [];
    if (!db.meals) db.meals = [];

    const lockIndex = db.dailyMealLocks.findIndex((l) => l.date === date);

    const syncMealsToMatrix = () => {
      const approvedMembers = db.members.filter((m) => {
        if (m.role === 'SUPER_ADMIN') return false;
        if (m.status !== 'APPROVED') return false;
        if (m.joinDate && date < m.joinDate) return false;
        if (m.leaveDate && date > m.leaveDate) return false;
        return true;
      });

      let syncedCount = 0;
      for (const m of approvedMembers) {
        const directReq = (db.mealRequests || []).find(
          (r) => r.memberId === m.id && r.date === date
        );
        const prevReq = !directReq
          ? (db.mealRequests || [])
              .filter((r) => r.memberId === m.id && r.date < date)
              .sort((a, b) => b.date.localeCompare(a.date))[0]
          : null;
        const req = directReq || prevReq;

        // If no custom or inherited request, defaults to B + L + D
        const b = req ? req.breakfast : true;
        const l = req ? req.lunch : true;
        const d = req ? req.dinner : true;
        const gb = Number(req?.guestBreakfast) || 0;
        const gl = Number(req?.guestLunch) || 0;
        const gd = Number(req?.guestDinner) || 0;
        const hasDetailedGuests = req && (req.guestBreakfast !== undefined || req.guestLunch !== undefined || req.guestDinner !== undefined);
        const guestPoints = hasDetailedGuests
          ? (gb * gbValue + gl * glValue + gd * gdValue)
          : (req ? (req.guestCount || 0) : 0) * glValue;

        const totalMealCount =
          (b ? bValue : 0) + (l ? lValue : 0) + (d ? dValue : 0) + guestPoints;

        const mealIndex = db.meals.findIndex(
          (entry) => entry.memberId === m.id && entry.yearMonth === yearMonth && entry.day === day
        );

        const mealObj: MealEntry = {
          id: `meal-${yearMonth}-${m.id}-${day}`,
          memberId: m.id,
          yearMonth,
          day,
          mealCount: Math.round(totalMealCount * 10) / 10,
          updatedAt: new Date().toISOString(),
        };

        if (mealIndex >= 0) {
          db.meals[mealIndex] = mealObj;
        } else {
          db.meals.push(mealObj);
        }
        syncedCount++;
      }
      return syncedCount;
    };

    if (action === 'ADD_TO_SHEET') {
      if (monthLock && monthLock.status === 'CLOSED') {
        return NextResponse.json({ error: 'এই মাসটি ইতোমধ্যে বন্ধ (CLOSED) করা হয়েছে। শিটে মিল যোগ করা যাবে না।' }, { status: 403 });
      }

      // Persist configured weights in dailyMealLocks
      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex].bValue = bValue;
        db.dailyMealLocks[lockIndex].lValue = lValue;
        db.dailyMealLocks[lockIndex].dValue = dValue;
        db.dailyMealLocks[lockIndex].gbValue = gbValue;
        db.dailyMealLocks[lockIndex].glValue = glValue;
        db.dailyMealLocks[lockIndex].gdValue = gdValue;
      }

      const syncedCount = syncMealsToMatrix();

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'ADD_MEALS_TO_SHEET',
        details: `Manager ${sessionUser.name} added meals for date ${date} to Google Sheets (${syncedCount} members).`,
        timestamp: new Date().toISOString(),
      });

      await saveDatabase(db, { syncGas: true });

      return NextResponse.json({
        success: true,
        message: `তারিখ ${date}-এর মিল সফলভাবে গুগল শিটে যোগ ও সেভ করা হয়েছে!`,
        isAddedToSheet: true,
        syncedCount,
      });
    } else if (action === 'REMOVE_FROM_SHEET') {
      if (monthLock && monthLock.status === 'CLOSED') {
        return NextResponse.json({ error: 'এই মাসটি ইতোমধ্যে বন্ধ (CLOSED) করা হয়েছে। শিট থেকে মিল মুছে ফেলা যাবে না।' }, { status: 403 });
      }

      db.meals = (db.meals || []).filter((m) => !(m.yearMonth === yearMonth && m.day === day));

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'REMOVE_MEALS_FROM_SHEET',
        details: `Manager ${sessionUser.name} removed meals for date ${date} from Google Sheets.`,
        timestamp: new Date().toISOString(),
      });

      await saveDatabase(db, { syncGas: true });

      return NextResponse.json({
        success: true,
        message: `তারিখ ${date}-এর মিল গুগল শিট থেকে মুছে ফেলা হয়েছে!`,
        isAddedToSheet: false,
      });
    } else if (action === 'LOCK_SESSION') {
      const { mealType } = body;
      if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        return NextResponse.json({ error: 'Valid mealType (breakfast, lunch, dinner) is required.' }, { status: 400 });
      }

      const existingLock = lockIndex >= 0 ? db.dailyMealLocks[lockIndex] : null;
      const bLocked = mealType === 'breakfast' ? true : Boolean(existingLock?.breakfastLocked ?? existingLock?.isLocked);
      const lLocked = mealType === 'lunch' ? true : Boolean(existingLock?.lunchLocked ?? existingLock?.isLocked);
      const dLocked = mealType === 'dinner' ? true : Boolean(existingLock?.dinnerLocked ?? existingLock?.isLocked);
      const allLocked = bLocked && lLocked && dLocked;

      const lockObj: DailyMealLock = {
        date,
        yearMonth,
        isLocked: allLocked,
        breakfastLocked: bLocked,
        lunchLocked: lLocked,
        dinnerLocked: dLocked,
        lockedBy: sessionUser.name,
        lockedAt: new Date().toISOString(),
        bValue,
        lValue,
        dValue,
        gbValue,
        glValue,
        gdValue,
      };

      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex] = lockObj;
      } else {
        db.dailyMealLocks.push(lockObj);
      }

      const labelMap: Record<string, string> = {
        breakfast: 'সকালের নাস্তা',
        lunch: 'দুপুরের খাবার',
        dinner: 'রাতের খাবার',
      };

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'LOCK_MEAL_SESSION',
        details: `Manager ${sessionUser.name} locked ${mealType} meals for date ${date} on site.`,
        timestamp: new Date().toISOString(),
      });

      // Meal lock is preserved strictly on site without pushing to Google Sheets
      await saveLocalDatabase(db);

      return NextResponse.json({
        success: true,
        message: `তারিখ ${date}-এর ${labelMap[mealType]} সফলভাবে লক করা হয়েছে (সাইটে সংরক্ষিত)।`,
        isLocked: lockObj.isLocked,
        breakfastLocked: lockObj.breakfastLocked,
        lunchLocked: lockObj.lunchLocked,
        dinnerLocked: lockObj.dinnerLocked,
      });
    } else if (action === 'UNLOCK_SESSION') {
      const { mealType } = body;
      if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        return NextResponse.json({ error: 'Valid mealType (breakfast, lunch, dinner) is required.' }, { status: 400 });
      }

      const existingLock = lockIndex >= 0 ? db.dailyMealLocks[lockIndex] : null;
      const bLocked = mealType === 'breakfast' ? false : Boolean(existingLock?.breakfastLocked ?? existingLock?.isLocked);
      const lLocked = mealType === 'lunch' ? false : Boolean(existingLock?.lunchLocked ?? existingLock?.isLocked);
      const dLocked = mealType === 'dinner' ? false : Boolean(existingLock?.dinnerLocked ?? existingLock?.isLocked);
      const allLocked = bLocked && lLocked && dLocked;

      const lockObj: DailyMealLock = {
        date,
        yearMonth,
        isLocked: allLocked,
        breakfastLocked: bLocked,
        lunchLocked: lLocked,
        dinnerLocked: dLocked,
        lockedBy: existingLock?.lockedBy || sessionUser.name,
        lockedAt: existingLock?.lockedAt || new Date().toISOString(),
        bValue: existingLock?.bValue ?? bValue,
        lValue: existingLock?.lValue ?? lValue,
        dValue: existingLock?.dValue ?? dValue,
        gbValue: existingLock?.gbValue ?? gbValue,
        glValue: existingLock?.glValue ?? glValue,
        gdValue: existingLock?.gdValue ?? gdValue,
      };

      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex] = lockObj;
      } else {
        db.dailyMealLocks.push(lockObj);
      }

      const labelMap: Record<string, string> = {
        breakfast: 'সকালের নাস্তা',
        lunch: 'দুপুরের খাবার',
        dinner: 'রাতের খাবার',
      };

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'UNLOCK_MEAL_SESSION',
        details: `Manager ${sessionUser.name} unlocked ${mealType} meals for date ${date}.`,
        timestamp: new Date().toISOString(),
      });

      await saveLocalDatabase(db);

      return NextResponse.json({
        success: true,
        message: `তারিখ ${date}-এর ${labelMap[mealType]} আনলক করা হয়েছে। মেম্বাররা আবার পরিবর্তন করতে পারবেন।`,
        isLocked: lockObj.isLocked,
        breakfastLocked: lockObj.breakfastLocked,
        lunchLocked: lockObj.lunchLocked,
        dinnerLocked: lockObj.dinnerLocked,
      });
    } else if (action === 'LOCK_AND_SYNC' || action === 'LOCK_DATE' || action === 'LOCK_ALL') {
      const lockObj: DailyMealLock = {
        date,
        yearMonth,
        isLocked: true,
        breakfastLocked: true,
        lunchLocked: true,
        dinnerLocked: true,
        lockedBy: sessionUser.name,
        lockedAt: new Date().toISOString(),
        bValue,
        lValue,
        dValue,
        gbValue,
        glValue,
        gdValue,
      };

      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex] = lockObj;
      } else {
        db.dailyMealLocks.push(lockObj);
      }

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'LOCK_MEALS_ON_SITE',
        details: `Manager ${sessionUser.name} locked all meals for date ${date} on site.`,
        timestamp: new Date().toISOString(),
      });

      // Saved strictly on site; not added to Google Sheets until "Add to Sheet" is explicitly clicked
      await saveLocalDatabase(db);

      return NextResponse.json({
        success: true,
        message: `তারিখ ${date}-এর সব বেলার মিল সফলভাবে সাইটে লক করা হয়েছে। শিটে পাঠাতে 'শিটে যোগ করুন' চাপুন।`,
        isLocked: true,
        breakfastLocked: true,
        lunchLocked: true,
        dinnerLocked: true,
      });
    } else if (action === 'UNLOCK') {
      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex].isLocked = false;
        db.dailyMealLocks[lockIndex].breakfastLocked = false;
        db.dailyMealLocks[lockIndex].lunchLocked = false;
        db.dailyMealLocks[lockIndex].dinnerLocked = false;
        db.dailyMealLocks[lockIndex].lockedBy = undefined;
        db.dailyMealLocks[lockIndex].lockedAt = undefined;
      }

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'UNLOCK_MEALS',
        details: `Manager ${sessionUser.name} unlocked meals for date ${date}.`,
        timestamp: new Date().toISOString(),
      });

      await saveLocalDatabase(db);

      return NextResponse.json({
        success: true,
        message: `তারিখ ${date}-এর সব বেলার মিল আনলক করা হয়েছে। মেম্বাররা আবার তাদের পছন্দ আপডেট করতে পারবেন।`,
        isLocked: false,
        breakfastLocked: false,
        lunchLocked: false,
        dinnerLocked: false,
      });
    } else if (action === 'UPDATE_MEMBER_MEAL') {
      const { memberId, breakfast, lunch, dinner, guestBreakfast, guestLunch, guestDinner, guestCount, note } = body;

      if (!memberId) {
        return NextResponse.json({ error: 'memberId is required.' }, { status: 400 });
      }

      if (!db.mealRequests) db.mealRequests = [];
      const reqIndex = db.mealRequests.findIndex(
        (r) => r.memberId === memberId && r.date === date
      );

      const targetMember = db.members.find((m) => m.id === memberId);
      const memberName = targetMember ? targetMember.name : memberId;

      const gb = Number(guestBreakfast) || 0;
      const gl = Number(guestLunch) || 0;
      const gd = Number(guestDinner) || 0;
      const computedGuestCount = (guestBreakfast !== undefined || guestLunch !== undefined || guestDinner !== undefined)
        ? (gb + gl + gd)
        : Math.max(0, Number(guestCount) || 0);

      const updatedReq = {
        id: `req-${date}-${memberId}`,
        memberId,
        yearMonth,
        date,
        day,
        breakfast: Boolean(breakfast),
        lunch: Boolean(lunch),
        dinner: Boolean(dinner),
        guestBreakfast: gb,
        guestLunch: gl,
        guestDinner: gd,
        guestCount: computedGuestCount,
        note: note ? String(note).trim() : '',
        updatedAt: new Date().toISOString(),
      };

      if (reqIndex >= 0) {
        db.mealRequests[reqIndex] = updatedReq;
      } else {
        db.mealRequests.push(updatedReq);
      }

      // Persist configured weights in dailyMealLocks
      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex].bValue = bValue;
        db.dailyMealLocks[lockIndex].lValue = lValue;
        db.dailyMealLocks[lockIndex].dValue = dValue;
        db.dailyMealLocks[lockIndex].gbValue = gbValue;
        db.dailyMealLocks[lockIndex].glValue = glValue;
        db.dailyMealLocks[lockIndex].gdValue = gdValue;
      } else {
        db.dailyMealLocks.push({
          date,
          yearMonth,
          isLocked: false,
          breakfastLocked: false,
          lunchLocked: false,
          dinnerLocked: false,
          bValue,
          lValue,
          dValue,
          gbValue,
          glValue,
          gdValue,
        });
      }

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'MANAGER_SET_MEMBER_MEAL',
        details: `Manager ${sessionUser.name} set meal values for ${memberName} on ${date}: B=${updatedReq.breakfast}, L=${updatedReq.lunch}, D=${updatedReq.dinner}, G=${updatedReq.guestCount}.`,
        timestamp: new Date().toISOString(),
      });

      await saveLocalDatabase(db);

      return NextResponse.json({
        success: true,
        message: `${memberName}-এর মিল মান সাইটে সফলভাবে সংরক্ষিত হয়েছে।`,
        updatedRequest: updatedReq,
      });
    } else if (action === 'UPDATE_BULK_MEALS') {
      const { updates } = body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return NextResponse.json({ error: 'No updates provided.' }, { status: 400 });
      }

      if (!db.mealRequests) db.mealRequests = [];

      // Persist configured weights in dailyMealLocks
      if (lockIndex >= 0) {
        db.dailyMealLocks[lockIndex].bValue = bValue;
        db.dailyMealLocks[lockIndex].lValue = lValue;
        db.dailyMealLocks[lockIndex].dValue = dValue;
        db.dailyMealLocks[lockIndex].gbValue = gbValue;
        db.dailyMealLocks[lockIndex].glValue = glValue;
        db.dailyMealLocks[lockIndex].gdValue = gdValue;
      } else {
        db.dailyMealLocks.push({
          date,
          yearMonth,
          isLocked: false,
          breakfastLocked: false,
          lunchLocked: false,
          dinnerLocked: false,
          bValue,
          lValue,
          dValue,
          gbValue,
          glValue,
          gdValue,
        });
      }

      for (const item of updates) {
        if (!item.memberId) continue;
        const b = Boolean(item.breakfast);
        const l = Boolean(item.lunch);
        const d = Boolean(item.dinner);
        const gb = Number(item.guestBreakfast) || 0;
        const gl = Number(item.guestLunch) || 0;
        const gd = Number(item.guestDinner) || 0;
        const totalG = (item.guestBreakfast !== undefined || item.guestLunch !== undefined || item.guestDinner !== undefined)
          ? (gb + gl + gd)
          : Math.max(0, Number(item.guestCount) || 0);

        const reqIdx = db.mealRequests.findIndex(
          (r) => r.memberId === item.memberId && r.date === date
        );

        const updatedReq = {
          id: `req-${date}-${item.memberId}`,
          memberId: item.memberId,
          yearMonth,
          date,
          day,
          breakfast: b,
          lunch: l,
          dinner: d,
          guestBreakfast: gb,
          guestLunch: gl,
          guestDinner: gd,
          guestCount: totalG,
          note: item.note ? String(item.note).trim() : '',
          updatedAt: new Date().toISOString(),
        };

        if (reqIdx >= 0) {
          db.mealRequests[reqIdx] = updatedReq;
        } else {
          db.mealRequests.push(updatedReq);
        }
      }

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: 'MANAGER_SET_BULK_MEALS',
        details: `Manager ${sessionUser.name} updated meal values for ${updates.length} members on ${date}.`,
        timestamp: new Date().toISOString(),
      });

      await saveLocalDatabase(db);

      return NextResponse.json({
        success: true,
        message: `${updates.length} জন মেম্বারের মিল মান সাইটে সফলভাবে সংরক্ষিত হয়েছে।`,
      });
    }

    return NextResponse.json({ error: 'Invalid action provided.' }, { status: 400 });
  } catch (error) {
    console.error('Cooking board POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
