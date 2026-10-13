import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/db';

export async function GET(request: Request) {
  const db = await getDatabase();
  const logs = (db.auditLogs || []).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({ logs });
}
