import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, getMonthScopedData } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import { SettlementEntry, Deposit } from '../../../lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth');

    if (yearMonth) {
      const monthScoped = await getMonthScopedData(yearMonth);
      return NextResponse.json({
        settlements: monthScoped.settlements,
        source: monthScoped.source,
      });
    }

    const db = await getDatabase();
    return NextResponse.json({ settlements: db.settlements || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const { memberId, yearMonth, type, amount, note } = await request.json();
    if (!memberId || !yearMonth || !type || !amount) {
      return NextResponse.json({ error: 'Member ID, yearMonth, type, and amount are required.' }, { status: 400 });
    }

    const db = await getDatabase();

    const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === String(yearMonth));
    const isMonthManager = Boolean(
      monthLock && (monthLock.managerId === user.id || monthLock.managerId === user.memberId)
    );

    if (user.role !== 'SUPER_ADMIN' && !isMonthManager) {
      return NextResponse.json(
        { error: 'অননুমোদিত: শুধুমাত্র এই মাসের দায়িত্বপ্রাপ্ত বিগত ম্যানেজার বা সুপার এডমিন সেটেলমেন্ট করতে পারবেন।' },
        { status: 403 }
      );
    }

    if (!db.settlements) db.settlements = [];
    if (!db.deposits) db.deposits = [];

    const newSettlement: SettlementEntry = {
      id: `set-${Date.now()}`,
      memberId: String(memberId),
      yearMonth: String(yearMonth),
      type: type as 'DUE_COLLECTION' | 'REFUND_PAYOUT',
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      recordedBy: user.name,
      note: note ? String(note) : undefined,
      createdAt: new Date().toISOString(),
    };

    db.settlements.push(newSettlement);

    // Directly adjust the member's deposit balance:
    // DUE_COLLECTION -> Member paid due money into the mess fund (+amount)
    // REFUND_PAYOUT -> Mess paid surplus refund out to the member (-amount)
    const depositDelta = type === 'DUE_COLLECTION' ? Number(amount) : -Number(amount);
    const settlementDeposit: Deposit = {
      id: `dep-${newSettlement.id}`,
      memberId: String(memberId),
      yearMonth: String(yearMonth),
      date: newSettlement.date,
      amount: depositDelta,
      note: note
        ? `Settlement (${type === 'DUE_COLLECTION' ? 'Due Collection' : 'Refund Payout'}): ${note}`
        : `Settlement: ${type === 'DUE_COLLECTION' ? 'Due Collection' : 'Refund Payout'}`,
      createdAt: new Date().toISOString(),
    };
    db.deposits.push(settlementDeposit);

    const targetMember = db.members.find((m) => m.id === memberId);
    const memberName = targetMember ? targetMember.name : memberId;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'RECORD_SETTLEMENT',
      details: `Recorded ${type === 'DUE_COLLECTION' ? 'Due Collection' : 'Refund Payout'} of ৳ ${Number(amount).toFixed(2)} for ${memberName} in ${yearMonth} (Deposit adjusted by ${depositDelta > 0 ? '+' : ''}${depositDelta.toFixed(2)}).`,
      timestamp: new Date().toISOString(),
      targetMemberId: String(memberId),
      yearMonth: String(yearMonth),
    });

    await saveDatabase(db);
    return NextResponse.json({ success: true, settlement: newSettlement, deposit: settlementDeposit });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
