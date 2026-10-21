/**
 * Meal Management System - Google Apps Script (GAS) Backend
 * 
 * Features:
 * - Single Monthly Sheet per archived month (e.g., '2026-08').
 * - Daily Meal Matrix + Financial Report combined in 1 single tab per month.
 * - OTP Password Reset via Security sheet tab & MailApp.sendEmail().
 * - Robust error handling for HTTP POST & JSON parsing.
 * - Standalone & Bound Container Spreadsheet support.
 */

var SPREADSHEET_ID = ""; // If standalone script, place your Google Sheet ID here e.g. "1abc..."
var API_KEY = "MILL_SECRET_KEY_2026";

function getSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  if (SPREADSHEET_ID && SPREADSHEET_ID.length > 5) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {}
  }
  return null;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "No post data payload received." });
    }

    var contents = {};
    try {
      contents = JSON.parse(e.postData.contents);
    } catch (pErr) {
      return responseJSON({ success: false, error: "Invalid JSON format in body payload." });
    }

    var action = contents.action;
    var providedKey = (e.parameter && e.parameter.key) || contents.apiKey;
    
    if (providedKey !== API_KEY) {
      return responseJSON({ success: false, error: "Unauthorized: Invalid API Key" });
    }
    
    var ss = getSpreadsheet();
    if (!ss) {
      return responseJSON({ success: false, error: "Spreadsheet reference not found. Ensure script is bound to Google Sheet or set SPREADSHEET_ID in Code.gs." });
    }

    ensureSheetStructure(ss);

    if (action === "getMillData") {
      var db = readFullData(ss);
      return responseJSON({ success: true, data: db });
    }

    if (action === "getMembers") {
      var members = readSheetJSON(ss, "Members");
      return responseJSON({ success: true, data: { members: members } });
    }
    
    if (action === "syncFullData") {
      writeFullDataSolution(ss, contents.db || {});
      generateAllMonthlyVisualSheets(ss, contents.db || {});
      return responseJSON({ success: true, message: "Data & monthly single-tab archives synchronized successfully." });
    }

    if (action === "wipeAllData") {
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName();
        if (/^\d{4}-\d{2}$/.test(sName)) {
          try {
            if (ss.getSheets().length > 1) {
              ss.deleteSheet(allSheets[s]);
            }
          } catch (e) {}
        }
      }
      writeFullDataSolution(ss, contents.db || {});
      return responseJSON({ success: true, message: "All sheet data and monthly tabs completely wiped and reset cleanly." });
    }

    if (action === "sendForgotPasswordOTP") {
      var result = sendForgotPasswordOTP(ss, contents.email, contents.code);
      return responseJSON(result);
    }

    if (action === "verifyOTPAndResetPassword") {
      var resetRes = verifyOTPAndResetPassword(ss, contents.email, contents.code, contents.newPasswordHash);
      return responseJSON(resetRes);
    }

    return responseJSON({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    if (ss) {
      ensureSheetStructure(ss);
    }
  } catch (err) {}
  return responseJSON({ success: true, message: "Meal Management System GAS Backend is Active. Required sheet tabs initialized." });
}

function responseJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheetStructure(ss) {
  var millsSheet = ss.getSheetByName("Mills");
  if (millsSheet) {
    try { ss.deleteSheet(millsSheet); } catch (e) {}
  }

  var sheets = ["Members", "Meals", "BazarEntries", "Expenses", "Deposits", "MonthLocks", "Settlements", "Security", "AuditLogs"];
  for (var i = 0; i < sheets.length; i++) {
    var sheet = ss.getSheetByName(sheets[i]);
    if (!sheet) {
      ss.insertSheet(sheets[i]);
    }
  }

  var membersSheet = ss.getSheetByName("Members");
  if (membersSheet) {
    try { membersSheet.setTabColor("#f59e0b"); } catch (e) {}
  }

  // Auto-hide backend technical sheets so users see a clean view of Members and Monthly tabs
  var techSheets = ["Meals", "Security", "AuditLogs", "MonthLocks", "Settlements", "BazarEntries", "Expenses", "Deposits"];
  for (var t = 0; t < techSheets.length; t++) {
    var techSheet = ss.getSheetByName(techSheets[t]);
    if (techSheet && ss.getSheets().length > 1) {
      try { techSheet.hideSheet(); } catch (e) {}
    }
  }
}

function readFullData(ss) {
  var members = readSheetJSON(ss, "Members");
  var meals = readSheetJSON(ss, "Meals");
  var bazarEntries = readSheetJSON(ss, "BazarEntries");
  var expenses = readSheetJSON(ss, "Expenses");
  var deposits = readSheetJSON(ss, "Deposits");
  var monthLocks = readSheetJSON(ss, "MonthLocks");
  var settlements = readSheetJSON(ss, "Settlements");
  var securityTokens = readSheetJSON(ss, "Security");
  var auditLogs = readSheetJSON(ss, "AuditLogs");

  // Fallback to monthly archive tab only if technical Meals sheet is empty
  if (!meals || meals.length === 0) {
    var allSheets = ss.getSheets();
    var extraMeals = [];

    for (var s = 0; s < allSheets.length; s++) {
      var sName = allSheets[s].getName();
      if (/^\d{4}-\d{2}$/.test(sName)) {
        var archived = readSingleMonthlyArchiveTab(allSheets[s], sName, members);
        extraMeals = extraMeals.concat(archived);
      }
    }
    meals = extraMeals;
  }

  return {
    members: members,
    meals: meals,
    bazarEntries: bazarEntries,
    expenses: expenses,
    deposits: deposits,
    monthLocks: monthLocks,
    settlements: settlements,
    securityTokens: securityTokens,
    auditLogs: auditLogs
  };
}

function readSingleMonthlyArchiveTab(sheet, yearMonth, members) {
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];

  var result = [];
  var memberNameMap = {};
  for (var m = 0; m < members.length; m++) {
    memberNameMap[members[m].name] = members[m].id;
  }

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row || row.length < 2) break;

    var col0 = String(row[0] || "").trim();
    var col1 = String(row[1] || "").trim();

    // STOP immediately when Daily Matrix table ends (blank row, section divider, totals, or financial table header)
    if (!col0 && !col1) break;
    if (col0.indexOf("---") === 0 || col1.indexOf("---") === 0) break;
    if (col0 === "TOTALS" || col0 === "Room") break;

    var memName = col1;
    var memId = memberNameMap[memName];
    if (!memId) continue;

    for (var day = 1; day <= 31; day++) {
      var colIdx = day + 1;
      if (colIdx < row.length - 1) {
        var count = Number(row[colIdx]) || 0;
        if (count > 0) {
          result.push({
            id: "meal-" + yearMonth + "-" + memId + "-" + day,
            memberId: memId,
            yearMonth: yearMonth,
            day: day,
            mealCount: count,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
  }
  return result;
}

function readSheetJSON(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];
  
  var headers = data[0];
  var result = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var item = {};
    var emptyCount = 0;
    for (var c = 0; c < headers.length; c++) {
      item[headers[c]] = row[c];
      if (row[c] === "" || row[c] === null) emptyCount++;
    }
    if (emptyCount < headers.length) {
      result.push(item);
    }
  }
  return result;
}

function writeFullDataSolution(ss, db) {
  writeCleanSheetJSON(ss, "Members", db.members || []);
  writeOperationalSheetJSON(ss, "Meals", db.meals || []);
  writeOperationalSheetJSON(ss, "BazarEntries", db.bazarEntries || []);
  writeOperationalSheetJSON(ss, "Expenses", db.expenses || []);
  writeOperationalSheetJSON(ss, "Deposits", db.deposits || []);
  writeOperationalSheetJSON(ss, "MonthLocks", db.monthLocks || []);
  writeOperationalSheetJSON(ss, "Settlements", db.settlements || []);
  writeCleanSheetJSON(ss, "Security", db.securityTokens || []);
  writeCleanSheetJSON(ss, "AuditLogs", db.auditLogs || []);
}

function writeOperationalSheetJSON(ss, sheetName, items) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Read existing items on sheet
  var existingItems = readSheetJSON(ss, sheetName) || [];

  // Find which yearMonths are present in incoming items
  var incomingMonths = {};
  for (var i = 0; i < (items || []).length; i++) {
    if (items[i] && items[i].yearMonth) {
      incomingMonths[items[i].yearMonth] = true;
    }
  }

  // Preserve existing historical records belonging to other months
  var preservedItems = [];
  for (var e = 0; e < existingItems.length; e++) {
    var ym = existingItems[e].yearMonth;
    if (ym && !incomingMonths[ym]) {
      preservedItems.push(existingItems[e]);
    }
  }

  // Combine preserved past months with fresh incoming active month items
  var combined = preservedItems.concat(items || []);
  writeCleanSheetJSON(ss, sheetName, combined);
}

function writeCleanSheetJSON(ss, sheetName, items) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  if (!items || !Array.isArray(items) || items.length === 0) return;

  var headerSet = {};
  // Pre-seed schema headers so optional fields like memberId are never dropped
  if (sheetName === "Expenses") {
    headerSet["id"] = true;
    headerSet["yearMonth"] = true;
    headerSet["category"] = true;
    headerSet["memberId"] = true;
    headerSet["amount"] = true;
    headerSet["updatedAt"] = true;
  } else if (sheetName === "Members") {
    headerSet["id"] = true;
    headerSet["memberId"] = true;
    headerSet["name"] = true;
    headerSet["phone"] = true;
    headerSet["roomNo"] = true;
    headerSet["email"] = true;
    headerSet["address"] = true;
    headerSet["status"] = true;
    headerSet["role"] = true;
    headerSet["joinDate"] = true;
    headerSet["leaveDate"] = true;
    headerSet["passwordHash"] = true;
    headerSet["createdAt"] = true;
  }

  for (var idx = 0; idx < items.length; idx++) {
    if (items[idx] && typeof items[idx] === 'object') {
      var keys = Object.keys(items[idx]);
      for (var k = 0; k < keys.length; k++) {
        if (keys[k] !== "millId") {
          headerSet[keys[k]] = true;
        }
      }
    }
  }

  var headers = Object.keys(headerSet);
  var values = [headers];

  for (var i = 0; i < items.length; i++) {
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var val = items[i][headers[h]];
      if (val === undefined || val === null) {
        row.push("");
      } else if (headers[h] === "yearMonth") {
        row.push("'" + String(val));
      } else if (Array.isArray(val)) {
        row.push(val.join(","));
      } else {
        row.push(val);
      }
    }
    values.push(row);
  }

  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function generateAllMonthlyVisualSheets(ss, db) {
  var meals = db.meals || [];
  var members = db.members || [];
  var bazarEntries = db.bazarEntries || [];
  var expenses = db.expenses || [];
  var deposits = db.deposits || [];
  var monthLocks = db.monthLocks || [];

  var monthsSet = {};
  for (var i = 0; i < meals.length; i++) {
    var ym = String(meals[i].yearMonth || "").replace(/^'/, "").trim();
    if (ym) monthsSet[ym] = true;
  }
  for (var b = 0; b < bazarEntries.length; b++) {
    var ymB = String(bazarEntries[b].yearMonth || "").replace(/^'/, "").trim();
    if (ymB) monthsSet[ymB] = true;
  }
  for (var e = 0; e < expenses.length; e++) {
    var ymE = String(expenses[e].yearMonth || "").replace(/^'/, "").trim();
    if (ymE) monthsSet[ymE] = true;
  }
  for (var d = 0; d < deposits.length; d++) {
    var ymD = String(deposits[d].yearMonth || "").replace(/^'/, "").trim();
    if (ymD) monthsSet[ymD] = true;
  }
  for (var ml = 0; ml < monthLocks.length; ml++) {
    var ymL = String(monthLocks[ml].yearMonth || "").replace(/^'/, "").trim();
    if (ymL) monthsSet[ymL] = true;
  }

  var monthsList = Object.keys(monthsSet);
  if (monthsList.length === 0) monthsList = ["2026-10"];

  for (var m = 0; m < monthsList.length; m++) {
    var yearMonth = monthsList[m];
    var lock = null;
    for (var lk = 0; lk < monthLocks.length; lk++) {
      if (monthLocks[lk].yearMonth === yearMonth) {
        lock = monthLocks[lk];
        break;
      }
    }
    var isClosed = lock && (lock.status === "CLOSED" || lock.status === "LOCKED");
    var tabSheet = generateCombinedMonthlyTab(ss, yearMonth, members, meals, bazarEntries, expenses, deposits, lock);
    if (tabSheet) {
      try {
        tabSheet.setTabColor(isClosed ? "#64748b" : "#10b981");
      } catch (e) {}
    }
  }
}

function generateCombinedMonthlyTab(ss, yearMonth, members, meals, bazarEntries, expenses, deposits, lock) {
  var sheet = ss.getSheetByName(yearMonth);
  if (!sheet) {
    sheet = ss.insertSheet(yearMonth);
  }
  sheet.clear();

  var matrixHeaders = ["Room", "Member Name"];
  for (var d = 1; d <= 31; d++) {
    matrixHeaders.push("Day " + d);
  }
  matrixHeaders.push("Total Meals");

  var rows = [];

  function pushPaddedRow(arr) {
    var r = arr.slice();
    while (r.length < matrixHeaders.length) {
      r.push("");
    }
    rows.push(r);
  }

  // Resolve assigned managers for this month (up to 3)
  var managerNames = [];
  if (lock) {
    var mIds = [];
    if (Array.isArray(lock.managerIds)) {
      mIds = lock.managerIds;
    } else if (lock.managerIds && typeof lock.managerIds === 'string') {
      mIds = lock.managerIds.split(',');
    } else if (lock.managerId) {
      mIds = [lock.managerId];
    }
    for (var mi = 0; mi < mIds.length; mi++) {
      var targetId = String(mIds[mi]).trim();
      for (var mb = 0; mb < members.length; mb++) {
        if (members[mb].id === targetId || members[mb].memberId === targetId) {
          managerNames.push(members[mb].name + (members[mb].roomNo ? " (রুম " + members[mb].roomNo + ")" : ""));
          break;
        }
      }
    }
  }
  var managerBanner = managerNames.length > 0 
    ? "দায়িত্বপ্রাপ্ত ম্যানেজারবৃন্দ (" + managerNames.length + "/৩ জন): " + managerNames.join("  •  ") 
    : "দায়িত্বপ্রাপ্ত ম্যানেজার: কোনো ম্যানেজার নির্ধারিত নেই";

  var isClosed = lock && (lock.status === "CLOSED" || lock.status === "LOCKED");
  pushPaddedRow(["মিল ম্যানেজমেন্ট সিস্টেম", "মাসিক হিসাব বিবরণী — " + yearMonth, "স্ট্যাটাস: " + (isClosed ? "লকড" : "চলমান")]);
  pushPaddedRow([managerBanner]);
  pushPaddedRow([]);

  pushPaddedRow(matrixHeaders);

  var monthMeals = [];
  var totalMeals = 0;
  for (var mm = 0; mm < meals.length; mm++) {
    var ymM = String(meals[mm].yearMonth || "").replace(/^'/, "").trim();
    if (ymM === yearMonth) {
      monthMeals.push(meals[mm]);
      var mc = Number(meals[mm].mealCount) || 0;
      totalMeals += mc;
    }
  }

  var activeMembers = [];
  for (var a = 0; a < members.length; a++) {
    var memItem = members[a];
    if (memItem.role === "SUPER_ADMIN") continue;
    var joinYM = String(memItem.joinDate || "").substring(0, 7);
    if (joinYM && joinYM > yearMonth) continue;

    var leaveYM = String(memItem.leaveDate || "").substring(0, 7);
    if (leaveYM && leaveYM < yearMonth) {
      var hadMeals = false;
      for (var km = 0; km < monthMeals.length; km++) {
        if (monthMeals[km].memberId === memItem.id && (Number(monthMeals[km].mealCount) || 0) > 0) {
          hadMeals = true;
          break;
        }
      }
      var hadDep = false;
      for (var dp = 0; dp < deposits.length; dp++) {
        var ymD = String(deposits[dp].yearMonth || "").replace(/^'/, "").trim();
        if (deposits[dp].memberId === memItem.id && ymD === yearMonth && (Number(deposits[dp].amount) || 0) > 0) {
          hadDep = true;
          break;
        }
      }
      if (!hadMeals && !hadDep) continue;
    }

    if (memItem.status === "APPROVED" || memItem.status === "MANAGER" || memItem.role === "MANAGER" || memItem.role === "MEMBER") {
      activeMembers.push(memItem);
    }
  }
  var activeCount = activeMembers.length || 1;

  for (var i = 0; i < activeMembers.length; i++) {
    var mem = activeMembers[i];
    var row = [mem.roomNo || "", mem.name || ""];
    var total = 0;

    for (var day = 1; day <= 31; day++) {
      var found = 0;
      for (var k = 0; k < monthMeals.length; k++) {
        if (monthMeals[k].memberId === mem.id && Number(monthMeals[k].day) === day) {
          found = Number(monthMeals[k].mealCount) || 0;
          break;
        }
      }
      row.push(found);
      total += found;
    }
    row.push(total);
    pushPaddedRow(row);
  }

  pushPaddedRow([]);
  pushPaddedRow(["--- FINANCIAL REPORT SUMMARY (" + yearMonth + ") ---"]);

  var totalBazar = 0;
  var monthBazarList = [];
  for (var b = 0; b < bazarEntries.length; b++) {
    var ymB = String(bazarEntries[b].yearMonth || "").replace(/^'/, "").trim();
    if (ymB === yearMonth) {
      totalBazar += Number(bazarEntries[b].amount) || 0;
      monthBazarList.push(bazarEntries[b]);
    }
  }

  var millRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;

  var monthExp = [];
  for (var e = 0; e < expenses.length; e++) {
    var ymE = String(expenses[e].yearMonth || "").replace(/^'/, "").trim();
    if (ymE === yearMonth) monthExp.push(expenses[e]);
  }

  function getMemberUtilityCost(cat, memberId) {
    var shared = 0;
    var direct = 0;
    for (var x = 0; x < monthExp.length; x++) {
      if (monthExp[x].category === cat) {
        if (!monthExp[x].memberId) {
          shared += Number(monthExp[x].amount) || 0;
        } else if (monthExp[x].memberId === memberId) {
          direct += Number(monthExp[x].amount) || 0;
        }
      }
    }
    return (shared / activeCount) + direct;
  }

  var totalUtilityExpenses = 0;
  for (var ue = 0; ue < monthExp.length; ue++) {
    totalUtilityExpenses += Number(monthExp[ue].amount) || 0;
  }

  var reportHeaders = [
    "Room", "Member Name", "Meals", "Meal Cost (৳)", 
    "Khala Bill (৳)", "Gas Bill (৳)", "Extra Cost (৳)", "Fridge Bill (৳)",
    "Total Cost (৳)", "Deposit (৳)", "Balance Status"
  ];

  pushPaddedRow(reportHeaders);

  var totalCostSum = 0;
  var totalDepositSum = 0;
  var totalKhalaSum = 0;
  var totalGasSum = 0;
  var totalExtraSum = 0;
  var totalFridgeSum = 0;

  for (var am = 0; am < activeMembers.length; am++) {
    var m = activeMembers[am];
    var memMeals = 0;
    for (var km = 0; km < monthMeals.length; km++) {
      if (monthMeals[km].memberId === m.id) {
        memMeals += Number(monthMeals[km].mealCount) || 0;
      }
    }

    var mKhala = getMemberUtilityCost("KHALA_BILL", m.id);
    var mGas = getMemberUtilityCost("GAS_BILL", m.id);
    var mExtra = getMemberUtilityCost("EXTRA_COST", m.id);
    var mFridge = getMemberUtilityCost("FRIDGE_BILL", m.id);

    totalKhalaSum += mKhala;
    totalGasSum += mGas;
    totalExtraSum += mExtra;
    totalFridgeSum += mFridge;

    var mealCost = memMeals * millRate;
    var totalCost = mealCost + mKhala + mGas + mExtra + mFridge;
    totalCostSum += totalCost;

    var memDeposit = 0;
    for (var dp = 0; dp < deposits.length; dp++) {
      var ymD = String(deposits[dp].yearMonth || "").replace(/^'/, "").trim();
      if (deposits[dp].memberId === m.id && ymD === yearMonth) {
        memDeposit += Number(deposits[dp].amount) || 0;
      }
    }
    totalDepositSum += memDeposit;

    var balDiff = memDeposit - totalCost;
    var statusStr = balDiff >= 0 ? ("REFUND: ৳ " + balDiff.toFixed(2)) : ("DUE: ৳ " + Math.abs(balDiff).toFixed(2));

    pushPaddedRow([
      m.roomNo || "",
      m.name || "",
      memMeals.toFixed(1),
      mealCost.toFixed(2),
      mKhala.toFixed(2),
      mGas.toFixed(2),
      mExtra.toFixed(2),
      mFridge.toFixed(2),
      totalCost.toFixed(2),
      memDeposit.toFixed(2),
      statusStr
    ]);
  }

  var cashInHand = totalDepositSum - totalBazar - totalUtilityExpenses;

  pushPaddedRow([
    "TOTALS", "Mill Rate: ৳ " + millRate.toFixed(3), totalMeals.toFixed(1), 
    "Bazar: ৳ " + totalBazar.toFixed(2), totalKhalaSum.toFixed(2), 
    totalGasSum.toFixed(2), totalExtraSum.toFixed(2), totalFridgeSum.toFixed(2),
    totalCostSum.toFixed(2), totalDepositSum.toFixed(2), 
    "CASH IN HAND: ৳ " + cashInHand.toFixed(2)
  ]);

  // Section 3: Daily Bazar Log Table
  pushPaddedRow([]);
  pushPaddedRow(["--- DAILY BAZAR EXPENSES LOG (" + yearMonth + ") ---"]);
  pushPaddedRow(["Date", "Description / Items Purchased", "Shopper (বাজারকারী)", "Amount (৳)"]);

  monthBazarList.sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); });
  for (var bz = 0; bz < monthBazarList.length; bz++) {
    var bEntry = monthBazarList[bz];
    pushPaddedRow([bEntry.date || "", bEntry.description || "Bazar", bEntry.shopperName || "", (Number(bEntry.amount) || 0).toFixed(2)]);
  }
  pushPaddedRow(["TOTAL BAZAR", "", "", "৳ " + totalBazar.toFixed(2)]);

  // Section 4: Utility Bills Breakdown
  pushPaddedRow([]);
  pushPaddedRow(["--- UTILITY BILLS BREAKDOWN (" + yearMonth + ") ---"]);
  pushPaddedRow(["Category", "Distribution / Member", "Amount (৳)"]);
  for (var u = 0; u < monthExp.length; u++) {
    var uItem = monthExp[u];
    var uCat = uItem.category === 'KHALA_BILL' ? 'Khala Bill (Cook)' : uItem.category === 'GAS_BILL' ? 'Gas Bill' : uItem.category === 'FRIDGE_BILL' ? 'Fridge Bill' : 'Extra Cost';
    var uMemName = "সকলের মাঝে সমান";
    if (uItem.memberId) {
      for (var mb = 0; mb < members.length; mb++) {
        if (members[mb].id === uItem.memberId) {
          uMemName = "নির্দিষ্ট: " + members[mb].name + " (Room " + (members[mb].roomNo || "") + ")";
          break;
        }
      }
    }
    pushPaddedRow([uCat, uMemName, (Number(uItem.amount) || 0).toFixed(2)]);
  }
  pushPaddedRow(["TOTAL UTILITIES", "", "৳ " + totalUtilityExpenses.toFixed(2)]);

  sheet.getRange(1, 1, rows.length, matrixHeaders.length).setValues(rows);

  sheet.getRange(1, 1, 1, matrixHeaders.length)
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  sheet.getRange(2, 1, 1, matrixHeaders.length)
    .setBackground("#ecfdf5")
    .setFontColor("#065f46")
    .setFontWeight("bold");

  sheet.getRange(4, 1, 1, matrixHeaders.length)
    .setBackground("#1e40af")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  SpreadsheetApp.flush();
  return sheet;
}

function sendForgotPasswordOTP(ss, email, code) {
  if (!email) return { success: false, error: "Email is required." };
  
  var members = readSheetJSON(ss, "Members");
  var user = null;
  for (var i = 0; i < members.length; i++) {
    if (members[i].email && members[i].email.toLowerCase() === email.toLowerCase()) {
      user = members[i];
      break;
    }
  }

  if (!user) {
    return { success: false, error: "No member found with this registered email address." };
  }

  if (!code) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  }
  var now = new Date();
  var expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  var securitySheet = ss.getSheetByName("Security");
  if (!securitySheet) {
    securitySheet = ss.insertSheet("Security");
    securitySheet.appendRow(["id", "email", "code", "createdAt", "expiresAt", "status"]);
  }

  var tokenId = "sec-" + Date.now();
  securitySheet.appendRow([tokenId, email, code, now.toISOString(), expiresAt, "PENDING"]);

  try {
    MailApp.sendEmail({
      to: email,
      subject: "Meal Management System - Password Reset Code",
      htmlBody: "<div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>" +
                "<h2 style='color: #1e3a8a;'>Meal Management System</h2>" +
                "<p>Hello <b>" + user.name + "</b>,</p>" +
                "<p>You requested to reset your password. Use the OTP code below:</p>" +
                "<div style='font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: 4px; padding: 10px 0;'>" + code + "</div>" +
                "<p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>" +
                "</div>"
    });
    return { success: true, message: "Verification OTP code sent to email." };
  } catch (err) {
    return { success: false, error: "Failed to send email: " + err.toString() };
  }
}

function verifyOTPAndResetPassword(ss, email, code, newPasswordHash) {
  if (!email || !code || !newPasswordHash) {
    return { success: false, error: "Missing required fields." };
  }

  var securityTokens = readSheetJSON(ss, "Security");
  var validToken = null;
  var now = new Date().toISOString();

  for (var i = securityTokens.length - 1; i >= 0; i--) {
    var st = securityTokens[i];
    if (st.email && st.email.toLowerCase() === email.toLowerCase() && st.code === code && st.status === "PENDING") {
      if (st.expiresAt > now) {
        validToken = st;
        break;
      }
    }
  }

  if (!validToken) {
    return { success: false, error: "Invalid or expired OTP code." };
  }

  var membersSheet = ss.getSheetByName("Members");
  var data = membersSheet.getDataRange().getDisplayValues();
  var updated = false;

  for (var r = 1; r < data.length; r++) {
    if (data[r][4] && data[r][4].toLowerCase() === email.toLowerCase()) {
      membersSheet.getRange(r + 1, 10).setValue(newPasswordHash);
      updated = true;
      break;
    }
  }

  if (updated) {
    var secSheet = ss.getSheetByName("Security");
    var secData = secSheet.getDataRange().getDisplayValues();
    for (var sr = 1; sr < secData.length; sr++) {
      if (secData[sr][0] === validToken.id) {
        secSheet.getRange(sr + 1, 6).setValue("USED");
        break;
      }
    }
    return { success: true, message: "Password reset successfully." };
  }

  return { success: false, error: "Could not find member to update password." };
}
