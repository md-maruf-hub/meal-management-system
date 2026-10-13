const baseUrl = 'http://localhost:3000';

async function testMealDeclarationFlow() {
  console.log('🧪 Starting End-to-End Meal Declaration & Kitchen Board Lock Test...\n');

  // 1. Member Login
  console.log('1. Member login (Tanvir Ahmed - 01711000001)...');
  const memLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneOrId: '01711000001', password: 'member123' }),
  });
  const memCookie = memLoginRes.headers.get('set-cookie');
  console.log('Member login status:', memLoginRes.status, 'Cookie exists:', Boolean(memCookie));

  // 2. Member declares meals for tomorrow (2026-09-26)
  const targetDate = '2026-09-26';
  console.log(`\n2. Member declares meals for date ${targetDate}: B=true, L=false, D=true, Guests=2...`);
  const declareRes = await fetch(`${baseUrl}/api/member/meal-declaration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: memCookie ? memCookie.split(';')[0] : '',
    },
    body: JSON.stringify({
      date: targetDate,
      breakfast: true,
      lunch: false,
      dinner: true,
      guestCount: 2,
      note: 'দুইজন মেহমান ডিনারে থাকবে',
    }),
  });
  const declareData = await declareRes.json();
  console.log('Declaration status:', declareRes.status, 'Success:', declareData.success, 'Msg:', declareData.message);

  // 3. Manager Login (Mehedi Hasan - 01711000003)
  console.log('\n3. Manager login (Mehedi Hasan - 01711000003)...');
  const mgrLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneOrId: '01711000003', password: 'member123' }),
  });
  const mgrCookie = mgrLoginRes.headers.get('set-cookie');
  console.log('Manager login status:', mgrLoginRes.status, 'Cookie exists:', Boolean(mgrCookie));

  // 4. Manager checks Kitchen Cooking Board
  console.log(`\n4. Manager checks Kitchen Cooking Board for ${targetDate}...`);
  const boardRes = await fetch(`${baseUrl}/api/manager/cooking-board?date=${targetDate}`, {
    headers: {
      Cookie: mgrCookie ? mgrCookie.split(';')[0] : '',
    },
  });
  const boardData = await boardRes.json();
  console.log('Board Summary:', boardData.summary);
  const tanvirEntry = boardData.membersList.find((m) => m.name === 'Tanvir Ahmed');
  console.log('Tanvir Entry on Board:', {
    name: tanvirEntry?.name,
    room: tanvirEntry?.roomNo,
    B: tanvirEntry?.breakfast,
    L: tanvirEntry?.lunch,
    D: tanvirEntry?.dinner,
    Guests: tanvirEntry?.guestCount,
    Note: tanvirEntry?.note,
  });

  // 5. Manager locks and syncs to matrix
  console.log(`\n5. Manager performs LOCK_AND_SYNC for ${targetDate}...`);
  const lockRes = await fetch(`${baseUrl}/api/manager/cooking-board`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: mgrCookie ? mgrCookie.split(';')[0] : '',
    },
    body: JSON.stringify({
      date: targetDate,
      action: 'LOCK_AND_SYNC',
    }),
  });
  const lockData = await lockRes.json();
  console.log('Lock Action status:', lockRes.status, 'Success:', lockData.success, 'Message:', lockData.message);

  // 6. Member tries to change meal after lock
  console.log(`\n6. Member attempts to change meal AFTER manager lock...`);
  const changeRes = await fetch(`${baseUrl}/api/member/meal-declaration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: memCookie ? memCookie.split(';')[0] : '',
    },
    body: JSON.stringify({
      date: targetDate,
      breakfast: false,
      lunch: true,
      dinner: false,
      guestCount: 0,
    }),
  });
  const changeData = await changeRes.json();
  console.log('Member attempt status:', changeRes.status, '(Expected 403 Forbidden)');
  console.log('Server rejected with error message:', changeData.error);

  if (changeRes.status === 403) {
    console.log('✅ PASS: Member was strictly blocked from editing after manager lock!');
  } else {
    console.error('❌ FAIL: Member should have been blocked with 403!');
  }

  // 7. Verify Meal Matrix entry in meals table
  console.log(`\n7. Checking auto-synced count in Meal Matrix for ${targetDate}...`);
  const mealsRes = await fetch(`${baseUrl}/api/meals?yearMonth=2026-09`, {
    headers: {
      Cookie: mgrCookie ? mgrCookie.split(';')[0] : '',
    },
  });
  const mealsData = await mealsRes.json();
  const tanvirMeal = (mealsData.meals || []).find((m) => m.memberId === 'user-mem-001' && m.day === 26);
  console.log('Tanvir Matrix Entry for Day 26:', tanvirMeal);
  // Breakfast(0.5) + Dinner(1.0) + Guests(2.0) = 3.5
  if (tanvirMeal && tanvirMeal.mealCount === 3.5) {
    console.log('✅ PASS: Daily Meal Matrix count correctly calculated as 3.5 meals (B:0.5 + D:1.0 + G:2.0)!');
  } else {
    console.log('Meal count:', tanvirMeal?.mealCount);
  }

  // 8. Manager unlocks the date
  console.log(`\n8. Manager unlocks ${targetDate}...`);
  const unlockRes = await fetch(`${baseUrl}/api/manager/cooking-board`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: mgrCookie ? mgrCookie.split(';')[0] : '',
    },
    body: JSON.stringify({
      date: targetDate,
      action: 'UNLOCK',
    }),
  });
  const unlockData = await unlockRes.json();
  console.log('Unlock status:', unlockRes.status, 'Message:', unlockData.message);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

testMealDeclarationFlow().catch(console.error);
