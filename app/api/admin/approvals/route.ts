import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { AuditLog } from '../../../../lib/types';

export async function GET(request: Request) {
  const db = await getDatabase();
  const pendingMembers = db.members.filter((m) => m.status === 'PENDING');
  return NextResponse.json({ pendingMembers });
}

export async function POST(request: Request) {
  try {
    const { memberId, action, adminName } = await request.json();

    const db = await getDatabase();
    const index = db.members.findIndex((m) => m.id === memberId);

    if (index === -1) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    const targetMember = db.members[index];

    if (action === 'APPROVE') {
      const today = new Date().toISOString().split('T')[0];
      const activeCount = db.members.filter((m) => m.status === 'APPROVED').length + 1;
      const formattedMemberId = `MLL-2026-${String(activeCount).padStart(3, '0')}`;

      db.members[index].status = 'APPROVED';
      db.members[index].memberId = targetMember.memberId && targetMember.memberId.startsWith('MLL-') ? targetMember.memberId : formattedMemberId;
      db.members[index].joinDate = targetMember.joinDate || today;
      db.members[index].leaveDate = undefined;

      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: adminName || 'Super Admin',
        action: 'MEMBER_APPROVED',
        details: `Approved member ${targetMember.name} (${targetMember.phone}) and assigned Member ID: ${formattedMemberId}`,
        timestamp: new Date().toISOString(),
      };
      db.auditLogs.push(audit);
    } else if (action === 'REJECT') {
      db.members[index].status = 'REJECTED';

      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: adminName || 'Super Admin',
        action: 'MEMBER_REJECTED',
        details: `Rejected member registration for ${targetMember.name} (${targetMember.phone})`,
        timestamp: new Date().toISOString(),
      };
      db.auditLogs.push(audit);
    }

    await saveDatabase(db);
    return NextResponse.json({ success: true, member: db.members[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
