import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, getMonthScopedData } from '../../../lib/db';
import { Deposit } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || new Date().toISOString().substring(0, 7);

  const monthScoped = await getMonthScopedData(yearMonth);
  return NextResponse.json({
    deposits: monthScoped.deposits,
    source: monthScoped.source,
  });
}

export async function POST(request: Request) {
  try {
    const { yearMonth, memberId, amount, date, note } = await request.json();

    if (!yearMonth || !memberId || !amount) {
      return NextResponse.json({ error: 'Missing required deposit fields.' }, { status: 400 });
    }

    const db = await getDatabase();

    const isLocked = db.monthLocks.some(
      (l) => l.yearMonth === yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED')
    );
    if (isLocked) {
      return NextResponse.json({ error: `Month ${yearMonth} is closed/locked. Deposits cannot be modified.` }, { status: 403 });
    }

    const newDeposit: Deposit = {
      id: `dep-${Date.now()}`,
      memberId,
      yearMonth,
      date: date || new Date().toISOString().split('T')[0],
      amount: Number(amount),
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    db.deposits.push(newDeposit);

    const targetMember = db.members.find((m) => m.id === memberId);
    const memberName = targetMember ? targetMember.name : 'Member';

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'manager',
      userName: 'Mess Manager',
      action: 'DEPOSIT_LOGGED',
      details: `Recorded deposit of ৳ ${Number(amount).toFixed(2)} for ${memberName}${note ? ` (${note})` : ''}`,
      timestamp: new Date().toISOString(),
      targetMemberId: memberId,
      yearMonth,
    });

    await saveDatabase(db);

    return NextResponse.json({ success: true, deposit: newDeposit });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, amount, date, note } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing deposit id.' }, { status: 400 });

    const db = await getDatabase();
    const index = db.deposits.findIndex((d) => d.id === id);
    if (index === -1) return NextResponse.json({ error: 'Deposit not found.' }, { status: 404 });

    const target = db.deposits[index];
    const isLocked = db.monthLocks.some((l) => l.yearMonth === target.yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED'));
    if (isLocked) return NextResponse.json({ error: 'Month is closed/locked.' }, { status: 403 });

    if (amount !== undefined) target.amount = Number(amount);
    if (date) target.date = date;
    if (note !== undefined) target.note = note;

    db.deposits[index] = target;

    const targetMember = db.members.find((m) => m.id === target.memberId);
    const memberName = targetMember ? targetMember.name : 'Member';

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'manager',
      userName: 'Mess Manager',
      action: 'DEPOSIT_UPDATED',
      details: `Updated deposit record for ${memberName}: ৳ ${target.amount.toFixed(2)}`,
      timestamp: new Date().toISOString(),
      targetMemberId: target.memberId,
      yearMonth: target.yearMonth,
    });

    await saveDatabase(db);

    return NextResponse.json({ success: true, deposit: target });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing deposit id.' }, { status: 400 });

    const db = await getDatabase();
    const index = db.deposits.findIndex((d) => d.id === id);
    if (index === -1) return NextResponse.json({ error: 'Deposit not found.' }, { status: 404 });

    const target = db.deposits[index];
    const isLocked = db.monthLocks.some((l) => l.yearMonth === target.yearMonth && (l.status === 'CLOSED' || (l.status as any) === 'LOCKED'));
    if (isLocked) return NextResponse.json({ error: 'Month is closed/locked.' }, { status: 403 });

    const targetMember = db.members.find((m) => m.id === target.memberId);
    const memberName = targetMember ? targetMember.name : 'Member';

    db.deposits.splice(index, 1);

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'manager',
      userName: 'Mess Manager',
      action: 'DEPOSIT_DELETED',
      details: `Deleted deposit record of ৳ ${target.amount.toFixed(2)} for ${memberName}`,
      timestamp: new Date().toISOString(),
      targetMemberId: target.memberId,
      yearMonth: target.yearMonth,
    });

    await saveDatabase(db);

    return NextResponse.json({ success: true, message: 'Deposit deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
