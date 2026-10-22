import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';
import { ManagerNote } from '../../../../lib/types';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER' && (user.role as any) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const db = await getDatabase();
    const notes: ManagerNote[] = (db.managerNotes || []).sort((a, b) => {
      // Pinned notes first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then newest updatedAt first
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
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

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER' && (user.role as any) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, color, isPinned } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'নোটের বিবরণ লেখা আবশ্যক।' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db.managerNotes) {
      db.managerNotes = [];
    }

    const newNote: ManagerNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: (title || '').trim(),
      content: content.trim(),
      color: color || 'yellow',
      isPinned: Boolean(isPinned),
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
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER' && (user.role as any) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, content, color, isPinned } = body;

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db.managerNotes) {
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
      color: color || db.managerNotes[idx].color || 'yellow',
      isPinned: isPinned !== undefined ? Boolean(isPinned) : db.managerNotes[idx].isPinned,
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
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER' && (user.role as any) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db.managerNotes) {
      db.managerNotes = [];
    }

    db.managerNotes = db.managerNotes.filter((n) => n.id !== id);
    await saveDatabase(db);

    return NextResponse.json({ success: true, message: 'নোট সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
