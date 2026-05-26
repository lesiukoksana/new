const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const letters = [
  { character: 'А', video_url: '/videos/videoA.mp4' },
  { character: 'Б', video_url: '/videos/videoB.mp4' },
  { character: 'В', video_url: '/videos/videoVe.mp4' },
  { character: 'Г', video_url: '/videos/videoG.mp4' },
  { character: 'Ґ', video_url: '/videos/videoGe.mp4' },
  { character: 'Д', video_url: '/videos/videoD.mp4' },
  { character: 'Е', video_url: '/videos/videoE.mp4' },
  { character: 'Є', video_url: '/videos/videoYe.mp4' },
  { character: 'Ж', video_url: '/videos/videoZh.mp4' },
  { character: 'З', video_url: '/videos/videoZ.mp4' },
  { character: 'И', video_url: '/videos/videoY.mp4' },
  { character: 'І', video_url: '/videos/videoI.mp4' },
  { character: 'Ї', video_url: '/videos/videoYi.mp4' },
  { character: 'Й', video_url: '/videos/videoYj.mp4' },
  { character: 'К', video_url: '/videos/videoK.mp4' },
  { character: 'Л', video_url: '/videos/videoL.mp4' },
  { character: 'М', video_url: '/videos/videoM.mp4' },
  { character: 'Н', video_url: '/videos/videoN.mp4' },
  { character: 'О', video_url: '/videos/videoO.mp4' },
  { character: 'П', video_url: '/videos/videoP.mp4' },
  { character: 'Р', video_url: '/videos/videoR.mp4' },
  { character: 'С', video_url: '/videos/videoS.mp4' },
  { character: 'Т', video_url: '/videos/videoT.mp4' },
  { character: 'У', video_url: '/videos/videoU.mp4' },
  { character: 'Ф', video_url: '/videos/videoF.mp4' },
  { character: 'Х', video_url: '/videos/videoX.mp4' },
  { character: 'Ц', video_url: '/videos/videoC.mp4' },
  { character: 'Ч', video_url: '/videos/videoCh.mp4' },
  { character: 'Ш', video_url: '/videos/videoSh.mp4' },
  { character: 'Щ', video_url: '/videos/videoShch.mp4' },
  { character: 'Ь', video_url: '/videos/videoSoft.mp4' },
  { character: 'Ю', video_url: '/videos/videoYu.mp4' },
  { character: 'Я', video_url: '/videos/videoYa.mp4' }
];

db.serialize(() => {
  const stmt = db.prepare("UPDATE Gestures SET video_url = ? WHERE character = ?");
  letters.forEach((letter) => {
    stmt.run(letter.video_url, letter.character, function(err) {
        if (err) {
            console.error(`Error updating character ${letter.character}:`, err.message);
        } else if (this.changes === 0) {
            console.warn(`Character ${letter.character} not found in Gestures table.`);
        }
    });
  });
  stmt.finalize();
  console.log("Database update process for Gestures video URLs initiated.");
});

db.close();
