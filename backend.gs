const SHEET_ID = '1pUZkC4gEEGceSA5osoMBciH-LLNakjPaqCUcjLqIdG4';
const SHEET_NAME = 'Progress';

// Security model:
// - Treat every request parameter as untrusted.
// - Use strict allowlists for fixed-choice fields.
// - Reconstruct the storage key server-side; never trust a client-supplied key.
// - Store only validated, known-safe literals in the spreadsheet.
// - Validate JSONP callback names before reflecting them into JavaScript.
//
// This protects the Progress sheet from malformed input and spreadsheet/formula
// injection. It does NOT provide authentication; the web-app endpoint is still
// public when deployed with "Who has access: Anyone".

const ALLOWED_WEEKS = Object.freeze(['1','2','3','4']);

const SESSION_ITEMS = Object.freeze({
  monday: Object.freeze(['trailwalk']),
  tuesday: Object.freeze([
    'dorsi','plantar','invert','evert','bridge','abduction','extension',
    'sitstand','hipflex','single','tandem','birddog','calf','tib',
    'stepup','deadbug','sideplank'
  ]),
  wednesday: Object.freeze(['trailwalk']),
  thursday: Object.freeze([
    'restday','calfstretch','soleus','hamstring','hipflex','anklecircles'
  ]),
  friday: Object.freeze([
    'trailwalk','dorsi','plantar','invert','evert','bridge','abduction',
    'extension','sitstand','hipflex','single','tandem'
  ]),
  saturday: Object.freeze([
    'dorsi','plantar','invert','evert','bridge','abduction','extension',
    'sitstand','hipflex','single','tandem','birddog','calf','tib',
    'stepup','deadbug','sideplank'
  ]),
  sunday: Object.freeze(['trailwalk','restday'])
});

const MAX_PARAM_LENGTH = 100;
const CALLBACK_RE = /^atCloud(?:Callback|Save|Seed)_[A-Za-z0-9_]{1,80}$/;

function sheet_() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Progress sheet unavailable');
  return sh;
}

function cleanScalar_(value, fieldName) {
  if (value === undefined || value === null) {
    throw new Error('Invalid request');
  }

  let s = String(value);

  // Normalize Unicode before validation to avoid inconsistent representations.
  if (s.normalize) s = s.normalize('NFKC');

  if (s.length === 0 || s.length > MAX_PARAM_LENGTH) {
    throw new Error('Invalid request');
  }

  // Reject controls, CR/LF, tabs, NUL, and other non-printing characters.
  if (/[\u0000-\u001F\u007F-\u009F]/.test(s)) {
    throw new Error('Invalid request');
  }

  return s;
}

function validateWeek_(value) {
  const week = cleanScalar_(value, 'week');
  if (ALLOWED_WEEKS.indexOf(week) === -1) throw new Error('Invalid request');
  return week;
}

function validateDay_(value) {
  const day = cleanScalar_(value, 'day').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SESSION_ITEMS, day)) {
    throw new Error('Invalid request');
  }
  return day;
}

function validateItem_(value, day, week) {
  const item = cleanScalar_(value, 'item').toLowerCase();

  // Allowlist + semantic validation: item must belong to the selected day's session.
  if (SESSION_ITEMS[day].indexOf(item) === -1) {
    throw new Error('Invalid request');
  }

  // Week 1 intentionally has no Step-Up exercise.
  if (week === '1' && item === 'stepup') {
    throw new Error('Invalid request');
  }

  return item;
}

function validateCompleted_(value) {
  const s = cleanScalar_(value, 'completed').toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  throw new Error('Invalid request');
}

function validateCallback_(value) {
  if (value === undefined || value === null || String(value) === '') return '';
  const callback = cleanScalar_(value, 'callback');
  if (!CALLBACK_RE.test(callback)) throw new Error('Invalid callback');
  return callback;
}

function safeKey_(week, day, item) {
  // All components have already passed strict allowlist validation.
  return 'at-v2-w' + week + '-' + day + '-' + item;
}

function jsonp_(callback, obj) {
  const body = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function loadData_() {
  const rows = sheet_().getDataRange().getValues();
  const data = {};

  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || '');

    // Only expose records created by this application.
    const match = /^at-v2-w([1-4])-(monday|tuesday|wednesday|thursday|friday|saturday|sunday)-([a-z0-9]+)$/.exec(key);
    if (!match) continue;

    const week = match[1];
    const day = match[2];
    const item = match[3];

    if (!Object.prototype.hasOwnProperty.call(SESSION_ITEMS, day)) continue;
    if (SESSION_ITEMS[day].indexOf(item) === -1) continue;
    if (week === '1' && item === 'stepup') continue;

    data[key] = {
      week: week,
      day: day,
      item: item,
      completed: rows[i][4] === true || String(rows[i][4]).toLowerCase() === 'true',
      updatedAt: rows[i][5] instanceof Date ? rows[i][5].toISOString() : ''
    };
  }

  return data;
}

function saveRecord_(p) {
  // Validate syntax and semantics server-side. Do not trust browser validation.
  const week = validateWeek_(p.week);
  const day = validateDay_(p.day);
  const item = validateItem_(p.item, day, week);
  const completed = validateCompleted_(p.completed);

  // Deliberately ignore any client-supplied "key" and build it from validated fields.
  const key = safeKey_(week, day, item);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sh = sheet_();
    const values = sh.getDataRange().getValues();
    let row = 0;

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '') === key) {
        row = i + 1;
        break;
      }
    }

    const targetRow = row || (sh.getLastRow() + 1);

    // Store A:D as plain text as defense in depth against spreadsheet formula interpretation.
    sh.getRange(targetRow, 1, 1, 4).setNumberFormat('@');
    sh.getRange(targetRow, 1, 1, 6).setValues([[
      key,
      week,
      day,
      item,
      completed,
      new Date()
    ]]);

  } finally {
    lock.releaseLock();
  }

  return {ok:true,key:key,completed:completed};
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  let callback = '';

  try {
    callback = validateCallback_(p.callback);
    const action = p.action === undefined ? 'load' : cleanScalar_(p.action, 'action').toLowerCase();

    if (action === 'save') {
      return jsonp_(callback, saveRecord_(p));
    }

    if (action === 'load') {
      return jsonp_(callback, {ok:true,data:loadData_()});
    }

    throw new Error('Invalid request');

  } catch (err) {
    // Do not echo untrusted input or detailed internals back to callers.
    return jsonp_(callback, {ok:false,error:'Request rejected'});
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};

  try {
    return ContentService
      .createTextOutput(JSON.stringify(saveRecord_(p)))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok:false,error:'Request rejected'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
