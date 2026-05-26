const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.run('UPDATE Letters SET video_url = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"', (err) => {
  if (err) {
    console.error('Update failed:', err);
  } else {
    console.log('Update successful');
  }
  db.close();
});
