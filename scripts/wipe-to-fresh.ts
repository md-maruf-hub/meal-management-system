import { getInitialData, writeDb } from '../lib/db/local-storage';

function wipeToFreshProductionState() {
  console.log("=== Wiping Database to Fresh Production State ===");
  const freshDb = getInitialData();
  writeDb(freshDb);
  console.log("✓ database.json has been reset to 100% clean fresh production state.");
  console.log("✓ Initial Super Admin Credentials:");
  console.log("    Phone: 01700000000");
  console.log("    Password: admin123");
}

wipeToFreshProductionState();
