import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, getMonthScopedData } from '../../../lib/db';
import { BazarEntry, ExpenseItem } from '../../../lib/types';

import { verifyToken } from '../../../lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || new Date().toISOString().substring(0, 7);

  const monthScoped = await getMonthScopedData(yearMonth);
  const members = (monthScoped.members || [])
    .filter((m) => m.status === 'APPROVED' && m.role !== 'SUPER_ADMIN')
    .map((m) => ({ id: m.id, memberId: m.memberId, name: m.name, roomNo: m.roomNo }));

  return NextResponse.json({
    bazarEntries: monthScoped.bazarEntries,
    expenses: monthScoped.expenses,
    members,
    source: monthScoped.source,
  });
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const { type, yearMonth, data, managerId } = await request.json();
    const db = await getDatabase();

    // Verify manager assignment for this month
    const monthLock = db.monthLocks.find((l) => l.yearMonth === yearMonth);
    const isMonthManager = Boolean(
      monthLock && (monthLock.managerId === user.id || monthLock.managerId === user.memberId)
    );

    if (user.role !== 'SUPER_ADMIN' && !isMonthManager) {
      return NextResponse.json({ error: 'অননুমোদিত: শুধুমাত্র এই মাসের ম্যানেজার বা সুপার এডমিন খরচ এন্ট্রি করতে পারবেন।' }, { status: 403 });
    }

    const isLocked = db.monthLocks.some(
      (l) => l.yearMonth === yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED')
    );
    if (isLocked) {
      return NextResponse.json({ error: `Month ${yearMonth} is closed/locked. Operational changes disallowed.` }, { status: 403 });
    }

    if (type === 'BAZAR') {
      const { date, amount, description, shopperName } = data;
      const newEntry: BazarEntry = {
        id: `bazar-${Date.now()}`,
        yearMonth,
        date: date || new Date().toISOString().split('T')[0],
        amount: Number(amount),
        description: description || 'Bazar Expense',
        shopperName: shopperName ? String(shopperName).trim() : '',
        managerId: user.id || managerId || 'user-manager',
        createdAt: new Date().toISOString(),
      };
      db.bazarEntries.push(newEntry);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        userName: user.name || 'Mess Manager',
        action: 'BAZAR_LOGGED',
        details: `Logged Bazar: ${description || 'Daily Bazar'} (${newEntry.shopperName ? `বাজারকারী: ${newEntry.shopperName}, ` : ''}৳ ${Number(amount).toFixed(2)}) on ${newEntry.date}`,
        timestamp: new Date().toISOString(),
        yearMonth,
      });
    } else if (type === 'UTILITY') {
      const { category, amount, memberId } = data;
      const newExpense: ExpenseItem = {
        id: `exp-${Date.now()}`,
        yearMonth,
        category,
        memberId: memberId || undefined,
        amount: Number(amount),
        updatedAt: new Date().toISOString(),
      };
      db.expenses.push(newExpense);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        userName: user.name || 'Mess Manager',
        action: 'UTILITY_LOGGED',
        details: `Updated Utility Bill (${category}): ৳ ${Number(amount).toFixed(2)}`,
        timestamp: new Date().toISOString(),
        yearMonth,
      });
    }

    await saveDatabase(db);
    return NextResponse.json({ success: true, message: 'Expense entry recorded successfully.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const { type, id, data } = await request.json();
    const db = await getDatabase();

    if (type === 'BAZAR') {
      const index = db.bazarEntries.findIndex((b) => b.id === id);
      if (index === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      
      const target = db.bazarEntries[index];

      // Authorization check
      const monthLock = db.monthLocks.find((l) => l.yearMonth === target.yearMonth);
      const isMonthManager = Boolean(
        monthLock && (monthLock.managerId === user.id || monthLock.managerId === user.memberId)
      );
      if (user.role !== 'SUPER_ADMIN' && !isMonthManager) {
        return NextResponse.json({ error: 'অননুমোদিত: আপনি এই মাসের ম্যানেজার নন।' }, { status: 403 });
      }

      const isLocked = db.monthLocks.some((l) => l.yearMonth === target.yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED'));
      if (isLocked) return NextResponse.json({ error: 'Month is closed/locked.' }, { status: 403 });

      if (data.date) target.date = data.date;
      if (data.amount !== undefined) target.amount = Number(data.amount);
      if (data.description !== undefined) target.description = data.description;
      if (data.shopperName !== undefined) target.shopperName = String(data.shopperName).trim();

      db.bazarEntries[index] = target;
    } else if (type === 'UTILITY') {
      const index = db.expenses.findIndex((e) => e.id === id);
      if (index === -1) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

      const target = db.expenses[index];

      // Authorization check
      const monthLock = db.monthLocks.find((l) => l.yearMonth === target.yearMonth);
      const isMonthManager = Boolean(
        monthLock && (monthLock.managerId === user.id || monthLock.managerId === user.memberId)
      );
      if (user.role !== 'SUPER_ADMIN' && !isMonthManager) {
        return NextResponse.json({ error: 'অননুমোদিত: আপনি এই মাসের ম্যানেজার নন।' }, { status: 403 });
      }

      const isLocked = db.monthLocks.some((l) => l.yearMonth === target.yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED'));
      if (isLocked) return NextResponse.json({ error: 'Month is closed/locked.' }, { status: 403 });

      if (data.amount !== undefined) target.amount = Number(data.amount);
      if (data.category) target.category = data.category;
      if (data.memberId !== undefined) {
        target.memberId = data.memberId ? String(data.memberId) : undefined;
      }
      target.updatedAt = new Date().toISOString();

      db.expenses[index] = target;
    }

    await saveDatabase(db);
    return NextResponse.json({ success: true, message: 'Expense entry updated successfully.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) return NextResponse.json({ error: 'Missing id or type.' }, { status: 400 });

    const db = await getDatabase();

    if (type === 'BAZAR') {
      const index = db.bazarEntries.findIndex((b) => b.id === id);
      if (index === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

      const target = db.bazarEntries[index];

      // Authorization check
      const monthLock = db.monthLocks.find((l) => l.yearMonth === target.yearMonth);
      const isMonthManager = Boolean(
        monthLock && (monthLock.managerId === user.id || monthLock.managerId === user.memberId)
      );
      if (user.role !== 'SUPER_ADMIN' && !isMonthManager) {
        return NextResponse.json({ error: 'অননুমোদিত: আপনি এই মাসের ম্যানেজার নন।' }, { status: 403 });
      }

      const isLocked = db.monthLocks.some((l) => l.yearMonth === target.yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED'));
      if (isLocked) return NextResponse.json({ error: 'Month is closed/locked.' }, { status: 403 });

      db.bazarEntries.splice(index, 1);
    } else if (type === 'UTILITY') {
      const index = db.expenses.findIndex((e) => e.id === id);
      if (index === -1) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

      const target = db.expenses[index];

      // Authorization check
      const monthLock = db.monthLocks.find((l) => l.yearMonth === target.yearMonth);
      const isMonthManager = Boolean(
        monthLock && (monthLock.managerId === user.id || monthLock.managerId === user.memberId)
      );
      if (user.role !== 'SUPER_ADMIN' && !isMonthManager) {
        return NextResponse.json({ error: 'অননুমোদিত: আপনি এই মাসের ম্যানেজার নন।' }, { status: 403 });
      }

      const isLocked = db.monthLocks.some((l) => l.yearMonth === target.yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED'));
      if (isLocked) return NextResponse.json({ error: 'Month is closed/locked.' }, { status: 403 });

      db.expenses.splice(index, 1);
    }

    await saveDatabase(db);
    return NextResponse.json({ success: true, message: 'Entry deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

