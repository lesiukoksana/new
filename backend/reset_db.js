const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Clearing database tables...');
  db.run('DELETE FROM Attempt_Logs');
  db.run('DELETE FROM Practice_Sessions');
  db.run('DELETE FROM Gestures');
  db.run('DELETE FROM Modules');
  db.run('DELETE FROM Users');
  db.run('DELETE FROM Roles');
  console.log('Database tables cleared. Please restart your server to re-seed with the new curriculum.');
});

db.close();
