import { wipeDatabase } from '../lib/db';

async function run() {
  console.log("=== Wiping Database to Fresh Production State ===");
  const freshDb = await wipeDatabase(true);
  console.log("✓ database.json and Google Sheets have been reset to 100% clean fresh production state.");
  console.log(`✓ Active members: ${freshDb.members.length} (Super Admin)`);
  console.log(`✓ Meals: ${freshDb.meals.length}`);
  console.log(`✓ Bazar entries: ${freshDb.bazarEntries.length}`);
  console.log(`✓ Expenses: ${freshDb.expenses.length}`);
  console.log(`✓ Deposits: ${freshDb.deposits.length}`);
  console.log("✓ Initial Super Admin Credentials:");
  console.log("    Phone: 01700000000");
  console.log("    Password: admin123");
  console.log("    Master PIN: 2026");
}

run().catch(console.error);
