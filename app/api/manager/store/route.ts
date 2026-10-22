import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';
import { ManagerNote } from '../../../../lib/types';

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
    let notes: ManagerNote[] = Array.isArray(db.managerNotes) ? [...db.managerNotes] : [];

    // Sort newest first
    notes.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRunningManagerUser(request);
    if (auth.error || !auth.user || !auth.db) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, db } = auth;
    const body = await request.json().catch(() => ({}));
    const { title, content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'নোটের বিবরণ লেখা আবশ্যক।' }, { status: 400 });
    }

    if (!Array.isArray(db.managerNotes)) {
      db.managerNotes = [];
    }

    const newNote: ManagerNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: (title || '').trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.name || 'ম্যানেজার',
    };

    db.managerNotes.unshift(newNote);
    await saveDatabase(db);

    return NextResponse.json({ success: true, note: newNote });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getRunningManagerUser(request);
    if (auth.error || !auth.user || !auth.db) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { db } = auth;
    const body = await request.json().catch(() => ({}));
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    if (!Array.isArray(db.managerNotes)) {
      db.managerNotes = [];
    }

    const idx = db.managerNotes.findIndex((n) => n.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'নোটটি পাওয়া যায়নি।' }, { status: 404 });
    }

    db.managerNotes[idx] = {
      ...db.managerNotes[idx],
      title: title !== undefined ? title.trim() : db.managerNotes[idx].title,
      content: content !== undefined ? content.trim() : db.managerNotes[idx].content,
      updatedAt: new Date().toISOString(),
    };

    await saveDatabase(db);

    return NextResponse.json({ success: true, note: db.managerNotes[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getRunningManagerUser(request);
    if (auth.error || !auth.user || !auth.db) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { db } = auth;
    let id = new URL(request.url).searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    if (!Array.isArray(db.managerNotes)) {
      db.managerNotes = [];
    }

    db.managerNotes = db.managerNotes.filter((n) => n.id !== id);
    await saveDatabase(db);

    return NextResponse.json({ success: true, message: 'নোট সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
