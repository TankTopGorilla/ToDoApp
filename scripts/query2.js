const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync('C:\\Users\\Berke\\.local\\share\\mimocode\\mimocode.db');
  const db = new SQL.Database(buffer);

  // Human-readable sessions (not checkpoint-writer)
  const rows = db.exec(`
    SELECT id, title, time_created, datetime(time_created/1000, 'unixepoch') as dt
    FROM session
    WHERE directory LIKE '%ToDoApp%'
      AND title NOT LIKE 'checkpoint-writer%'
    ORDER BY time_created DESC
    LIMIT 20
  `);
  console.log('=== HUMAN-READABLE SESSIONS ===');
  if (rows[0]) {
    for (const row of rows[0].values) {
      const sid = row[0];
      const count = db.exec(`SELECT COUNT(*) FROM message WHERE session_id = '${sid}'`);
      console.log(JSON.stringify(row), 'msgs:', count[0]?.values[0][0]);
    }
  }

  // Also check current session trajectory for recent user statements with key terms
  const currentSid = 'ses_07f7c2171ffeU8mT4D6B2qxtcG';
  console.log('\n=== CURRENT SESSION MESSAGES (first 5) ===');
  const msgs = db.exec(`
    SELECT m.id, json_extract(m.data, '$.role') as role, substr(m.data, 1, 200) as preview
    FROM message m
    WHERE m.session_id = '${currentSid}'
    ORDER BY m.time_created ASC
    LIMIT 10
  `);
  if (msgs[0]) {
    for (const row of msgs[0].values) {
      console.log(row[0], row[1], row[2]?.substring(0, 150));
    }
  }
}

main().catch(console.error);
