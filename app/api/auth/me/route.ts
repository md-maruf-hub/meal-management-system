import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const token = cookieHeader
    ?.split(';')
    .find((c) => c.trim().startsWith('mill_session='))
    ?.split('=')[1];

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
