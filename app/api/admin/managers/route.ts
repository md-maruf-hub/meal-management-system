import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { AuditLog, MonthLock } from '../../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth');

  const db = await getDatabase();
  const approvedMembers = db.members.filter(
    (m) => m.status === 'APPROVED' && m.role !== 'SUPER_ADMIN'
  );

  const monthLocks = db.monthLocks || [];
  const monthManagerMap: Record<string, string> = {};
  monthLocks.forEach((ml) => {
    if (ml.managerId) monthManagerMap[ml.yearMonth] = ml.managerId;
  });

  return NextResponse.json({
    members: approvedMembers,
    monthLocks,
    monthManagerMap,
  });
}

export async function POST(request: Request) {
  try {
    const { memberId, newRole, yearMonth, adminName } = await request.json();

    const db = await getDatabase();

    // Case 1: Assign Manager for a specific month
    if (yearMonth && memberId) {
      const targetMember = db.members.find((m) => m.id === memberId);
      if (!targetMember) {
        return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
      }

      targetMember.role = 'MANAGER';

      let lock = db.monthLocks.find((l) => l.yearMonth === yearMonth);
      if (!lock) {
        lock = {
          id: `lock-${Date.now()}`,
          yearMonth,
          status: 'RUNNING',
          managerId: memberId,
          lockedBy: adminName || 'Super Admin',
          lockedAt: new Date().toISOString(),
        };
        db.monthLocks.push(lock);
      } else {
        lock.managerId = memberId;
      }

      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: adminName || 'Super Admin',
        action: 'ASSIGN_MONTH_MANAGER',
        details: `Assigned ${targetMember.name} as Manager for month ${yearMonth}.`,
        timestamp: new Date().toISOString(),
      });

      await saveDatabase(db);
      return NextResponse.json({ success: true, message: `${targetMember.name} assigned as manager for ${yearMonth}.` });
    }

    // Case 2: General Role Change
    if (!memberId || (newRole !== 'MANAGER' && newRole !== 'MEMBER')) {
      return NextResponse.json({ error: 'Invalid memberId or newRole.' }, { status: 400 });
    }

    const index = db.members.findIndex((m) => m.id === memberId);
    if (index === -1) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    const targetMember = db.members[index];
    const oldRole = targetMember.role;
    db.members[index].role = newRole;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      userId: 'admin',
      userName: adminName || 'Super Admin',
      action: 'ROLE_CHANGED',
      details: `Changed role of ${targetMember.name} (${targetMember.memberId}) from ${oldRole} to ${newRole}.`,
      timestamp: new Date().toISOString(),
    });

    await saveDatabase(db);
    return NextResponse.json({ success: true, member: db.members[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
