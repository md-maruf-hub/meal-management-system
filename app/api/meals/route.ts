import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, getMonthScopedData } from '../../../lib/db';
import { MealEntry } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || new Date().toISOString().substring(0, 7);

  const monthScoped = await getMonthScopedData(yearMonth);
  return NextResponse.json({
    meals: monthScoped.meals,
    source: monthScoped.source,
  });
}

export async function POST(request: Request) {
  try {
    const { yearMonth, updates } = await request.json();

    if (!yearMonth || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const db = await getDatabase();

    const isLocked = db.monthLocks.some(
      (l) => l.yearMonth === yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED')
    );

    if (isLocked) {
      return NextResponse.json({ error: `Month ${yearMonth} is closed/locked. Meal modifications are prohibited.` }, { status: 403 });
    }

    for (const update of updates) {
      const { memberId, day, mealCount } = update;
      const existingIndex = db.meals.findIndex(
        (m) => m.yearMonth === yearMonth && m.memberId === memberId && m.day === day
      );

      if (existingIndex >= 0) {
        db.meals[existingIndex].mealCount = mealCount;
        db.meals[existingIndex].updatedAt = new Date().toISOString();
      } else {
        const newMeal: MealEntry = {
          id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          memberId,
          yearMonth,
          day,
          mealCount,
          updatedAt: new Date().toISOString(),
        };
        db.meals.push(newMeal);
      }
    }

    if (!db.auditLogs) db.auditLogs = [];
    const daysAffected = Array.from(new Set(updates.map((u: any) => u.day))).sort((a: any, b: any) => a - b);
    db.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'manager',
      userName: 'Mess Manager',
      action: 'MEALS_UPDATED',
      details: `Updated daily meals for ${yearMonth} (Day: ${daysAffected.join(', ') || 'N/A'}, ${updates.length} changes)`,
      timestamp: new Date().toISOString(),
      yearMonth,
    });

    await saveDatabase(db);

    return NextResponse.json({ success: true, message: 'Meal entries updated successfully.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
