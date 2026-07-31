var SHEET_NAME = 'Выгрузка с сайта';

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (data.action === 'delete') {
    deleteRowsByBetId(sheet, data.surebetId);
    return jsonResponse({ status: 'ok' });
  }

  if (data.action === 'sync') {
    var headers = [
      '№ аккаунта', 'БК', '№ Події', 'Дата ставки', 'Вид спорту',
      'Результат', 'Розмір ставки', 'Коеф', 'Дата закінчення',
      'Статус', 'Дохід', 'Коментар', 'ID ставки:'
    ];
    ensureHeaders(sheet, headers);

    var statusLabels = {
      won: 'Выигрыш',
      lost: 'Проигрыш',
      refund: 'Возврат',
      pending: 'Ожидает',
      half_won: 'Пол-выигрыш',
      half_lost: 'Пол-проигрыш'
    };

    var existingRows = findExistingRows(sheet, data.surebetId);
    if (existingRows.length === 0) {
      existingRows = findExistingRowsByLegs(sheet, data.surebetId, data.rows);
    }

    var eventNumber = existingRows.length > 0 ? existingRows[0].eventNumber : getNextEventNumber(sheet);

    var usedExisting = [];
    var rowsToAppend = [];
    var lastExistingRow = 0;

    data.rows.forEach(function (row) {
      var matchedIndex = -1;
      for (var i = 0; i < existingRows.length; i++) {
        if (usedExisting.indexOf(i) === -1 &&
            normalize(existingRows[i].bookmaker) === normalize(row.bookmaker) &&
            normalize(existingRows[i].market) === normalize(row.market)) {
          matchedIndex = i;
          usedExisting.push(i);
          break;
        }
      }

      if (matchedIndex === -1 && data.rows.length === existingRows.length) {
        for (var i = 0; i < existingRows.length; i++) {
          if (usedExisting.indexOf(i) === -1) {
            matchedIndex = i;
            usedExisting.push(i);
            break;
          }
        }
      }

      if (matchedIndex !== -1) {
        existingRows[matchedIndex].bookmaker = row.bookmaker;
        existingRows[matchedIndex].market = row.market;
      }

      var values = [
        row.account,
        row.bookmaker,
        eventNumber,
        row.betDate,
        row.sport,
        row.market,
        row.stake,
        row.odds,
        row.endDate,
        statusLabels[row.status] || row.status,
        row.profit,
        row.comment,
        row.betId
      ];

      if (matchedIndex !== -1) {
        var rowNum = existingRows[matchedIndex].row;
        sheet.getRange(rowNum, 1, 1, headers.length).setValues([values]);
        if (rowNum > lastExistingRow) lastExistingRow = rowNum;
      } else {
        rowsToAppend.push(values);
        if (existingRows.length > 0) {
          var maxRow = Math.max.apply(null, existingRows.map(function (r) { return r.row; }));
          if (maxRow > lastExistingRow) lastExistingRow = maxRow;
        }
      }
    });

    var rowsToDelete = [];
    for (var i = 0; i < existingRows.length; i++) {
      if (usedExisting.indexOf(i) === -1) {
        rowsToDelete.push(existingRows[i].row);
      }
    }
    rowsToDelete.sort(function (a, b) { return b - a; });
    rowsToDelete.forEach(function (rowNum) {
      sheet.deleteRow(rowNum);
    });

    if (rowsToAppend.length > 0) {
      if (lastExistingRow > 0) {
        sheet.insertRowsAfter(lastExistingRow, rowsToAppend.length);
        sheet.getRange(lastExistingRow + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      } else {
        rowsToAppend.forEach(function (values) {
          sheet.appendRow(values);
        });
      }
    }

    return jsonResponse({ status: 'ok' });
  }

  return jsonResponse({ status: 'unknown action' });
}

function deleteRowsByBetId(sheet, betId) {
  if (!betId || sheet.getLastRow() < 2) return;
  var idCol = findHeaderColumn(sheet, 'ID ставки:');
  if (!idCol) return;
  var values = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (normalize(values[i][0]) === normalize(betId)) {
      sheet.deleteRow(i + 2);
    }
  }
}

function findExistingRows(sheet, betId) {
  if (!betId || sheet.getLastRow() < 2) return [];
  var idCol = findHeaderColumn(sheet, 'ID ставки:');
  var bmCol = findHeaderColumn(sheet, 'БК');
  var marketCol = findHeaderColumn(sheet, 'Результат');
  var numCol = findHeaderColumn(sheet, '№ Події');
  if (!idCol || !bmCol || !marketCol || !numCol) return [];
  var lastRow = sheet.getLastRow();
  var idValues = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  var bmValues = sheet.getRange(2, bmCol, lastRow - 1, 1).getValues();
  var marketValues = sheet.getRange(2, marketCol, lastRow - 1, 1).getValues();
  var numValues = sheet.getRange(2, numCol, lastRow - 1, 1).getValues();
  var rows = [];
  var target = normalize(betId);
  for (var i = 0; i < idValues.length; i++) {
    if (normalize(idValues[i][0]) === target) {
      rows.push({
        row: i + 2,
        bookmaker: bmValues[i][0],
        market: marketValues[i][0],
        eventNumber: numValues[i][0]
      });
    }
  }
  return rows;
}

function findExistingRowsByLegs(sheet, betId, incomingRows) {
  if (!betId || sheet.getLastRow() < 2) return [];
  var idCol = findHeaderColumn(sheet, 'ID ставки:');
  var bmCol = findHeaderColumn(sheet, 'БК');
  var marketCol = findHeaderColumn(sheet, 'Результат');
  var numCol = findHeaderColumn(sheet, '№ Події');
  if (!idCol || !bmCol || !marketCol || !numCol) return [];
  var lastRow = sheet.getLastRow();
  var idValues = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  var bmValues = sheet.getRange(2, bmCol, lastRow - 1, 1).getValues();
  var marketValues = sheet.getRange(2, marketCol, lastRow - 1, 1).getValues();
  var numValues = sheet.getRange(2, numCol, lastRow - 1, 1).getValues();
  var used = [];
  var found = [];
  var targetId = normalize(betId);
  incomingRows.forEach(function (row) {
    var targetBm = normalize(row.bookmaker);
    var targetMarket = normalize(row.market);
    for (var i = 0; i < bmValues.length; i++) {
      if (used.indexOf(i) !== -1) continue;
      var id = normalize(idValues[i][0]);
      if (id !== '' && id !== targetId) continue;
      if (normalize(bmValues[i][0]) === targetBm &&
          normalize(marketValues[i][0]) === targetMarket) {
        used.push(i);
        found.push({
          row: i + 2,
          bookmaker: bmValues[i][0],
          market: marketValues[i][0],
          eventNumber: numValues[i][0]
        });
        break;
      }
    }
  });
  return found;
}

function findHeaderColumn(sheet, name) {
  if (sheet.getLastColumn() === 0) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var target = normalize(name);
  for (var i = 0; i < headers.length; i++) {
    if (normalize(headers[i]) === target) return i + 1;
  }
  return null;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  var current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var needsUpdate = current.length < headers.length;
  if (!needsUpdate) {
    for (var i = 0; i < headers.length; i++) {
      if (normalize(current[i]) !== normalize(headers[i])) {
        needsUpdate = true;
        break;
      }
    }
  }
  if (needsUpdate) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getNextEventNumber(sheet) {
  var numCol = findHeaderColumn(sheet, '№ Події');
  if (!numCol || sheet.getLastRow() < 2) return 1;
  var nums = sheet.getRange(2, numCol, sheet.getLastRow() - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < nums.length; i++) {
    var n = parseInt(String(nums[i][0]).trim());
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, '').trim();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
