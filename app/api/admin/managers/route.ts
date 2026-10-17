import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { AuditLog, MonthLock } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || new Date().toISOString().substring(0, 7);

  const db = await getDatabase();
  const approvedMembers = db.members.filter(
    (m) => m.status === 'APPROVED' && m.role !== 'SUPER_ADMIN'
  );

  const monthLocks = db.monthLocks || [];
  const currentLock = monthLocks.find((ml) => ml.yearMonth === yearMonth);

  const currentManagerIds: string[] = currentLock?.managerIds && currentLock.managerIds.length > 0
    ? currentLock.managerIds
    : (currentLock?.managerId ? [currentLock.managerId] : []);

  const assignedManagers = currentManagerIds
    .map((id) => db.members.find((m) => m.id === id || m.memberId === id))
    .filter(Boolean);

  const monthManagerMap: Record<string, string[]> = {};
  monthLocks.forEach((ml) => {
    const ids = ml.managerIds && ml.managerIds.length > 0 ? ml.managerIds : (ml.managerId ? [ml.managerId] : []);
    monthManagerMap[ml.yearMonth] = ids;
  });

  return NextResponse.json(
    {
      members: approvedMembers,
      monthLocks,
      yearMonth,
      currentManagerIds,
      assignedManagers,
      monthManagerMap,
      maxLimit: 3,
      isMaxReached: currentManagerIds.length >= 3,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const { memberId, action = 'ADD', yearMonth, adminName } = await request.json();

    if (!yearMonth || !memberId) {
      return NextResponse.json({ error: 'মেম্বার আইডি ও মাস নির্বাচন আবশ্যক।' }, { status: 400 });
    }

    const db = await getDatabase();
    const targetMember = db.members.find((m) => m.id === memberId || m.memberId === memberId);
    if (!targetMember) {
      return NextResponse.json({ error: 'মেম্বার খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    let lock = db.monthLocks.find((l) => l.yearMonth === yearMonth);
    if (!lock) {
      lock = {
        id: `lock-${Date.now()}`,
        yearMonth,
        status: 'RUNNING',
        managerIds: [],
        lockedBy: adminName || 'Super Admin',
        lockedAt: new Date().toISOString(),
      };
      db.monthLocks.push(lock);
    }

    if (!lock.managerIds) {
      lock.managerIds = lock.managerId ? [lock.managerId] : [];
    }

    // Handle REMOVE
    if (action === 'REMOVE') {
      lock.managerIds = lock.managerIds.filter((id) => id !== targetMember.id && id !== targetMember.memberId);
      lock.managerId = lock.managerIds[0] || undefined;

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: adminName || 'Super Admin',
        action: 'REMOVE_MONTH_MANAGER',
        details: `${yearMonth} মাসের ম্যানেজার পদ থেকে ${targetMember.name} কে অব্যাহতি দেওয়া হয়েছে।`,
        timestamp: new Date().toISOString(),
      });

      await saveDatabase(db);
      return NextResponse.json({
        success: true,
        message: `${targetMember.name} কে ${yearMonth} মাসের ম্যানেজার তালিকা থেকে সফলভাবে রিমুভ করা হয়েছে।`,
        managerIds: lock.managerIds,
      });
    }

    // Handle ADD
    const isAlreadyManager = lock.managerIds.some((id) => id === targetMember.id || id === targetMember.memberId);
    if (isAlreadyManager) {
      return NextResponse.json({
        error: `${targetMember.name} ইতিমধ্যে ${yearMonth} মাসের ম্যানেজার তালিকায় নিয়োজিত আছেন।`,
      }, { status: 400 });
    }

    if (lock.managerIds.length >= 3) {
      return NextResponse.json({
        error: 'এই মাসে ইতিমধ্যে সর্বোচ্চ ৩ জন ম্যানেজার নিয়োজিত আছেন। নতুন কাউকে যুক্ত করতে চাইলে আগে যেকোনো একজনকে রিমুভ করুন।',
      }, { status: 400 });
    }

    lock.managerIds.push(targetMember.id);
    lock.managerId = lock.managerIds[0];

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      userId: 'admin',
      userName: adminName || 'Super Admin',
      action: 'ASSIGN_MONTH_MANAGER',
      details: `${yearMonth} মাসের ম্যানেজার হিসেবে ${targetMember.name} (${targetMember.memberId}) কে নিয়োগ দেওয়া হয়েছে। (মোট: ${lock.managerIds.length}/৩ জন)`,
      timestamp: new Date().toISOString(),
    });

    await saveDatabase(db);
    return NextResponse.json({
      success: true,
      message: `${targetMember.name} কে ${yearMonth} মাসের ম্যানেজার হিসেবে সফলভাবে যুক্ত করা হয়েছে (${lock.managerIds.length}/৩ জন)।`,
      managerIds: lock.managerIds,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const adminName = searchParams.get('adminName') || 'Super Admin';

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId.' }, { status: 400 });
    }

    const db = await getDatabase();
    const index = db.members.findIndex((m) => m.id === memberId);

    if (index === -1) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    const targetMember = db.members[index];
    const today = new Date().toISOString().split('T')[0];
    db.members[index].status = 'INACTIVE';
    db.members[index].leaveDate = today;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      userId: 'admin',
      userName: adminName,
      action: 'MEMBER_DELETED',
      details: `Deleted member ${targetMember.name} (${targetMember.memberId}). Excluded from future active months.`,
      timestamp: new Date().toISOString(),
    });

    await saveDatabase(db);
    return NextResponse.json({ success: true, message: `Member ${targetMember.name} deleted successfully.` });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
