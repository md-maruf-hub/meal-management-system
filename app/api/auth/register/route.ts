import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { hashPassword } from '../../../../lib/password';
import { Member } from '../../../../lib/types';
import { normalizePhone } from '../../../../lib/auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name, phone, roomNo, email, address, emergencyContact, password } = await request.json();

    if (!name || !phone || !roomNo || !password) {
      return NextResponse.json({ error: 'নাম, ফোন নম্বর, রুম নম্বর ও পাসওয়ার্ড প্রদান করা আবশ্যক।' }, { status: 400 });
    }

    const normalizedNewPhone = normalizePhone(phone) || String(phone).trim();

    // Fetch latest database
    const db = await getDatabase();
    
    const existing = db.members.find((m) => {
      const p = normalizePhone(m.phone) || String(m.phone || '').trim();
      return p === normalizedNewPhone;
    });

    if (existing) {
      return NextResponse.json({ error: 'এই ফোন নম্বরটি ইতিমধ্যে নিবন্ধিত রয়েছে।' }, { status: 400 });
    }

    const newId = `user-${Date.now()}`;

    const newMember: Member = {
      id: newId,
      memberId: 'PENDING',
      name: String(name).trim(),
      phone: normalizedNewPhone,
      roomNo: String(roomNo).trim(),
      email: email ? String(email).trim() : '',
      address: address ? String(address).trim() : '',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : '',
      role: 'MEMBER',
      status: 'PENDING',
      joinDate: new Date().toISOString().split('T')[0],
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.members.push(newMember);

    // Save locally AND directly push to Google Sheets (awaiting confirmation)
    await saveDatabase(db, { syncGas: true, awaitGas: true });

    return NextResponse.json({
      success: true,
      message: 'নিবন্ধন আবেদন সফলভাবে জমা হয়েছে এবং গুগল শিটে সংরক্ষিত হয়েছে! সুপার অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।',
      member: {
        id: newMember.id,
        name: newMember.name,
        phone: newMember.phone,
        status: newMember.status,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
