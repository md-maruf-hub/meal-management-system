import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { hashPassword } from '../../../../lib/password';
import { Member } from '../../../../lib/types';

export async function POST(request: Request) {
  try {
    const { name, phone, roomNo, email, address, emergencyContact, password } = await request.json();

    if (!name || !phone || !roomNo || !password) {
      return NextResponse.json({ error: 'Name, Phone, Room No, and Password are required.' }, { status: 400 });
    }

    const db = await getDatabase();
    
    const existing = db.members.find((m) => m.phone === phone);
    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered.' }, { status: 400 });
    }

    const newId = `user-${Date.now()}`;

    const newMember: Member = {
      id: newId,
      memberId: 'PENDING',
      name,
      phone,
      roomNo,
      email: email || '',
      address: address || '',
      emergencyContact: emergencyContact || '',
      role: 'MEMBER',
      status: 'PENDING',
      joinDate: new Date().toISOString().split('T')[0],
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.members.push(newMember);
    await saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully. Please wait for Super Admin approval.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
