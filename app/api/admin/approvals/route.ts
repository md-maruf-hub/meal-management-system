import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { AuditLog } from '../../../../lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceFresh = searchParams.get('fresh') === '1';

    // Fetch database (force refresh from Google Sheets if requested)
    const db = await getDatabase(forceFresh);
    const pendingMembers = (db.members || []).filter((m) => m.status === 'PENDING');

    return NextResponse.json({
      success: true,
      pendingMembers,
      totalCount: pendingMembers.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch pending members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { memberId, action, adminName } = await request.json();

    const db = await getDatabase();
    const index = (db.members || []).findIndex((m) => m.id === memberId || m.memberId === memberId);

    if (index === -1) {
      return NextResponse.json({ error: 'সদস্যের তথ্য পাওয়া যায়নি।' }, { status: 404 });
    }

    const targetMember = db.members[index];

    if (action === 'APPROVE') {
      const today = new Date().toISOString().split('T')[0];
      const activeCount = (db.members || []).filter((m) => m.status === 'APPROVED').length + 1;
      const formattedMemberId = `MLL-2026-${String(activeCount).padStart(3, '0')}`;

      db.members[index].status = 'APPROVED';
      db.members[index].memberId = targetMember.memberId && targetMember.memberId.startsWith('MLL-')
        ? targetMember.memberId
        : formattedMemberId;
      db.members[index].joinDate = targetMember.joinDate || today;
      db.members[index].leaveDate = undefined;

      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: adminName || 'Super Admin',
        action: 'MEMBER_APPROVED',
        details: `Approved member ${targetMember.name} (${targetMember.phone}) with Member ID: ${db.members[index].memberId}`,
        timestamp: new Date().toISOString(),
      };
      if (!db.auditLogs) db.auditLogs = [];
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
      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.push(audit);
    }

    // Save locally AND sync directly with Google Sheets
    await saveDatabase(db, { syncGas: true, awaitGas: true });

    return NextResponse.json({ success: true, member: db.members[index] });
  } catch (error: any) {
    console.error('Approvals update error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
