const initSqlJs = require('sql.js');
const fs = require('fs');

const DB_PATH = 'C:\\Users\\Berke\\.local\\share\\mimocode\\mimocode.db';

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Recent ToDoApp sessions
  console.log('=== RECENT SESSIONS ===');
  const sessions = db.exec(`
    SELECT id, directory, title, time_created
    FROM session
    WHERE directory LIKE '%ToDoApp%'
    ORDER BY time_created DESC
    LIMIT 15
  `);
  if (sessions[0]) console.log(JSON.stringify(sessions[0].values, null, 2));

  // Count all ToDoApp sessions
  const counts = db.exec(`SELECT COUNT(*) as total FROM session WHERE directory LIKE '%ToDoApp%'`);
  console.log('\nTotal ToDoApp sessions:', counts[0]?.values[0]);

  // Get current session info
  const curr = db.exec(`SELECT id, directory, title, time_created FROM session ORDER BY time_created DESC LIMIT 5`);
  console.log('\n=== GLOBAL RECENT SESSIONS (all projects) ===');
  console.log(JSON.stringify(curr[0]?.values, null, 2));

  // Check session messages count
  const currentSessionId = 'ses_07f7c2171ffeU8mT4D6B2qxtcG';
  const msgCount = db.exec(`SELECT COUNT(*) as msg_count FROM message WHERE session_id = '${currentSessionId}'`);
  console.log(`\nMessages in current session:`, msgCount[0]?.values[0]);

  // Get unique project directories
  const projects = db.exec(`SELECT DISTINCT directory FROM session WHERE directory IS NOT NULL ORDER BY directory`);
  console.log('\n=== PROJECT DIRECTORIES ===');
  console.log(JSON.stringify(projects[0]?.values));
}

main().catch(console.error);
