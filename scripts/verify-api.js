async function verify() {
  console.log('Logging in as Super Admin to get session token...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneOrId: '01700000000', password: 'admin123' })
  });

  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status, 'Has Cookie:', Boolean(cookie));

  const headers = cookie ? { Cookie: cookie.split(';')[0] } : {};

  for (const ym of ['2026-07', '2026-08', '2026-09']) {
    const res = await fetch(`http://localhost:3000/api/reports?yearMonth=${ym}`, { headers });
    const data = await res.json();
    const r = data.report;
    console.log(`\n========================================`);
    console.log(`Report for: ${ym}`);
    console.log(`Assigned Manager: ${r.assignedManagerName}`);
    console.log(`Active Members Count: ${r.memberCalculations.length}`);
    console.log(`Total Meals: ${r.totalMeals}`);
    console.log(`Total Bazar Expenses: ৳${r.totalBazar}`);
    console.log(`Mill Rate: ৳${r.millRate} / meal`);
    console.log(`Total Utility Expenses: ৳${r.totalUtilities}`);
    console.log(`Total Member Deposits: ৳${r.totalDeposits}`);
    console.log(`Cash in Hand: ৳${r.cashInHand}`);
    console.log(`First Member: ${r.memberCalculations[0].memberName} - Meals: ${r.memberCalculations[0].meals}`);
    console.log(`Last Member: ${r.memberCalculations[r.memberCalculations.length - 1].memberName} - Meals: ${r.memberCalculations[r.memberCalculations.length - 1].meals}`);
  }
}

verify().catch(console.error);
