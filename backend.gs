const SHEET_ID = '1pUZkC4gEEGceSA5osoMBciH-LLNakjPaqCUcjLqIdG4';
const SHEET_NAME = 'Progress';

function sheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || '';
  const rows = sheet_().getDataRange().getValues();
  const data = {};
  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || '');
    if (!key) continue;
    data[key] = {
      week: String(rows[i][1] || ''),
      day: String(rows[i][2] || ''),
      item: String(rows[i][3] || ''),
      completed: String(rows[i][4]).toLowerCase() === 'true',
      updatedAt: rows[i][5] instanceof Date ? rows[i][5].toISOString() : String(rows[i][5] || '')
    };
  }
  const body = JSON.stringify({ok:true,data:data});
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const key = String(p.key || '').trim();
  if (!key) return ContentService.createTextOutput('missing key');

  const week = String(p.week || '');
  const day = String(p.day || '');
  const item = String(p.item || '');
  const completed = String(p.completed || '').toLowerCase() === 'true';

  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  let row = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '') === key) {
      row = i + 1;
      break;
    }
  }

  const payload = [[key, week, day, item, completed, new Date()]];
  if (row) {
    sh.getRange(row, 1, 1, 6).setValues(payload);
  } else {
    sh.appendRow(payload[0]);
  }

  return ContentService.createTextOutput('ok');
}
