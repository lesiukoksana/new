const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT character, video_url FROM Gestures LIMIT 5", [], (err, rows) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log("Current Gestures Sample:");
  rows.forEach((row) => {
    console.log(`${row.character}: ${row.video_url}`);
  });
});

db.close();
