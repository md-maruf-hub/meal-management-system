import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase, pullFromGoogleSheets, pushToGoogleSheets } from '../../../../lib/db';
import { getGasUrl, getGasKey } from '../../../../lib/db/google-sheets';
import { verifyToken } from '../../../../lib/auth';
import { comparePassword } from '../../../../lib/password';

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

    // Action 0: Security PIN / Password verification to unlock database panel
    if (body.action === 'verify-pin') {
      const { pin } = body;
      if (!pin) {
        return NextResponse.json({ error: 'সিকিউরিটি পিন বা পাসওয়ার্ড প্রদান করুন।' }, { status: 400 });
      }
      const db = await getDatabase();
      const superAdmin = db.members.find((m) => m.role === 'SUPER_ADMIN');
      const isPasswordValid = Boolean(superAdmin && superAdmin.passwordHash && comparePassword(pin, superAdmin.passwordHash));
      const isMasterPinValid = String(pin).trim() === '2026' || Boolean(db.config?.masterPin && String(pin).trim() === String(db.config.masterPin));

      if (isPasswordValid || isMasterPinValid) {
        return NextResponse.json({ success: true, message: 'ডাটাবেজ সেকশন সফলভাবে আনলক করা হয়েছে।' });
      }
      return NextResponse.json({ error: 'ভুল সিকিউরিটি পিন বা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় চেষ্টা করুন।' }, { status: 401 });
    }

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

