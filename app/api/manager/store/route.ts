import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

// Helper to verify if user is authorized as a running manager or admin
async function getRunningManagerUser(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return { error: 'Unauthorized: Login required', status: 401, user: null };
  }

  const db = await getDatabase();
  const isRunningMgr =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MANAGER' ||
    (db.monthLocks || []).some((l) => {
      const isRunning = l.status === 'RUNNING';
      const ids = l.managerIds && l.managerIds.length > 0 ? l.managerIds : (l.managerId ? [l.managerId] : []);
      return isRunning && (ids.includes(user.id) || ids.includes(user.memberId));
    });

  if (!isRunningMgr) {
    return { error: 'শুধুমাত্র রানিং ম্যানেজারের জন্য উন্মুক্ত।', status: 403, user: null };
  }

  return { error: null, status: 200, user, db };
}

export async function GET(request: Request) {
  try {
    const auth = await getRunningManagerUser(request);
    if (auth.error || !auth.user || !auth.db) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { db } = auth;
    let note = db.storeNote;

    // Backward-compatibility: if storeNote is not set yet, pull first managerNote if available
    if (!note && Array.isArray(db.managerNotes) && db.managerNotes.length > 0) {
      note = {
        content: db.managerNotes[0].content || '',
        updatedAt: db.managerNotes[0].updatedAt || db.managerNotes[0].createdAt || new Date().toISOString(),
        updatedBy: db.managerNotes[0].createdBy || 'ম্যানেজার',
      };
    }

    if (!note) {
      note = {
        content: '',
        updatedAt: '',
        updatedBy: '',
      };
    }

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleSaveNote(request);
}

export async function PUT(request: Request) {
  return handleSaveNote(request);
}

async function handleSaveNote(request: Request) {
  try {
    const auth = await getRunningManagerUser(request);
    if (auth.error || !auth.user || !auth.db) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, db } = auth;
    const body = await request.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    const updatedNote = {
      content,
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || 'ম্যানেজার',
    };

    db.storeNote = updatedNote;
    db.managerNotes = [
      {
        id: 'single-store-note',
        content,
        updatedAt: updatedNote.updatedAt,
        createdAt: updatedNote.updatedAt,
        createdBy: updatedNote.updatedBy,
      },
    ];

    await saveDatabase(db);

    return NextResponse.json({ success: true, note: updatedNote });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
