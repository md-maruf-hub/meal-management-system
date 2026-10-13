import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase, pullFromGoogleSheets, pushToGoogleSheets, wipeDatabase } from '../../../../lib/db';
import { getGasUrl, getGasKey } from '../../../../lib/db/google-sheets';
import { verifyToken } from '../../../../lib/auth';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
    }

    const currentUrl = getGasUrl();
    const currentKey = getGasKey();

    return NextResponse.json({
      gasUrl: currentUrl,
      gasKey: currentKey,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
    }

    const body = await request.json();

    // Action 1: Pull fresh data directly from Google Sheets
    if (body.action === 'pull') {
      const freshDb = await pullFromGoogleSheets();
      return NextResponse.json({
        success: true,
        message: `গুগল শিট থেকে সফলভাবে ডাটা ফেচ করা হয়েছে (${freshDb.members.length} জন মেম্বার, ${freshDb.meals.length} মিল রেকর্ড)।`,
        membersCount: freshDb.members.length,
        mealsCount: freshDb.meals.length,
      });
    }

    // Action 2: Push all current data to Google Sheets
    if (body.action === 'push') {
      await pushToGoogleSheets();
      return NextResponse.json({
        success: true,
        message: 'গুগল শিটে সম্পূর্ণ ডাটাবেজ সফলভাবে সিঙ্ক (Push) করা হয়েছে।',
      });
    }

    // Action 3: Wipe/Reset all test data cleanly
    if (body.action === 'wipe' || body.action === 'reset') {
      const wipedDb = await wipeDatabase(true);
      return NextResponse.json({
        success: true,
        message: 'ডাটাবেজ এবং গুগল শিট সম্পূর্ণ ফ্রেশ ও রিসেট করা হয়েছে। সিস্টেমটি নতুন টেস্টের জন্য প্রস্তুত।',
        membersCount: wipedDb.members.length,
      });
    }

    const { gasUrl, testOnly } = body;

    if (!gasUrl || !gasUrl.startsWith('https://script.google.com')) {
      return NextResponse.json({ error: 'Invalid Google Apps Script Web App URL.' }, { status: 400 });
    }

    // Ping the GAS endpoint
    const apiKey = getGasKey();
    const pingUrl = gasUrl.includes('?') ? `${gasUrl}&key=${encodeURIComponent(apiKey)}` : `${gasUrl}?key=${encodeURIComponent(apiKey)}`;

    const startTime = Date.now();
    let pingSuccess = false;
    let pingError = '';

    try {
      const res = await fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getMillData', apiKey }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        pingSuccess = true;
      } else {
        pingError = json.error || 'Endpoint returned unsuccessful response.';
      }
    } catch (err: any) {
      pingError = err.message || 'Failed to connect to Google Apps Script.';
    }

    const pingDuration = Date.now() - startTime;

    if (testOnly) {
      return NextResponse.json({
        success: pingSuccess,
        pingDuration,
        error: pingError || undefined,
      });
    }

    if (!pingSuccess) {
      return NextResponse.json({
        error: `Could not verify Google Apps Script URL: ${pingError}`,
      }, { status: 400 });
    }

    // Save to .env.local if filesystem is writable
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      const envContent = `GAS_API_URL=${gasUrl.trim()}
GAS_API_KEY=${apiKey}
NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
`;
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (e) {
      // In serverless environments like Vercel, filesystem is read-only
    }

    // Also update local database and trigger sync
    const db = await getDatabase();
    if (!db.config) db.config = {};
    db.config.gasUrl = gasUrl.trim();
    await saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Google Sheets Database URL saved and synchronized successfully!',
      pingDuration,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

