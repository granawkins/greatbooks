module.exports=[85148,(e,r,t)=>{r.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},18622,(e,r,t)=>{r.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},14747,(e,r,t)=>{r.exports=e.x("path",()=>require("path"))},24361,(e,r,t)=>{r.exports=e.x("util",()=>require("util"))},874,(e,r,t)=>{r.exports=e.x("buffer",()=>require("buffer"))},88947,(e,r,t)=>{r.exports=e.x("stream",()=>require("stream"))},54799,(e,r,t)=>{r.exports=e.x("crypto",()=>require("crypto"))},70406,(e,r,t)=>{r.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,r,t)=>{r.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},43793,e=>{"use strict";var r=e.i(85148);let t=e.i(14747).default.join(process.cwd(),"greatbooks.db"),s=new r.default(t,{readonly:!0});s.pragma("foreign_keys = ON");let a=new r.default(t);a.pragma("foreign_keys = ON"),a.pragma("busy_timeout = 5000"),a.exec(`
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    book_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    start_segment_seq INTEGER NOT NULL,
    start_char INTEGER NOT NULL,
    end_segment_seq INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('highlight', 'comment')),
    color TEXT DEFAULT 'yellow',
    comment_text TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_annotations_user_book ON annotations(user_id, book_id, chapter_number);
`);try{a.exec("ALTER TABLE books ADD COLUMN type TEXT DEFAULT 'book'")}catch{}try{a.exec("ALTER TABLE users ADD COLUMN playback_speed REAL DEFAULT 1.0")}catch{}a.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    book_id TEXT NOT NULL REFERENCES books(id),
    chapter_number INTEGER NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('listen', 'read')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_ms INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, started_at);
`);try{a.exec("ALTER TABLE chapters ADD COLUMN source_chapter_id INTEGER")}catch{}try{a.exec("ALTER TABLE chapters ADD COLUMN chapter_type TEXT DEFAULT 'text'")}catch{}e.s(["db",0,{getBooks:e=>e?s.prepare("SELECT * FROM books WHERE type = ?").all(e):s.prepare("SELECT * FROM books").all(),getBook:e=>s.prepare("SELECT * FROM books WHERE id = ?").get(e),getChapters:e=>s.prepare("SELECT * FROM chapters WHERE book_id = ? ORDER BY number").all(e),getChapter:(e,r)=>s.prepare("SELECT * FROM chapters WHERE book_id = ? AND number = ?").get(e,r),getSegments:e=>{let r=s.prepare("SELECT source_chapter_id FROM chapters WHERE id = ?").get(e),t=r?.source_chapter_id??e;return s.prepare("SELECT * FROM segments WHERE chapter_id = ? ORDER BY sequence").all(t)},getSourceBookInfo:(e,r)=>{let t=s.prepare("SELECT source_chapter_id FROM chapters WHERE book_id = ? AND number = ?").get(e,r);if(!t?.source_chapter_id)return null;let a=s.prepare("SELECT book_id, number FROM chapters WHERE id = ?").get(t.source_chapter_id);return a?{bookId:a.book_id,chapterNumber:a.number}:null},getResolvedChapter:e=>{let r=s.prepare("SELECT * FROM chapters WHERE id = ?").get(e);if(r){if(r.source_chapter_id){let e=s.prepare("SELECT * FROM chapters WHERE id = ?").get(r.source_chapter_id);if(e)return{...r,audio_file:e.audio_file,audio_duration_ms:e.audio_duration_ms}}return r}},upsertUser:e=>{a.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(e)},getUser:e=>s.prepare("SELECT * FROM users WHERE id = ?").get(e),getUserByEmail:e=>s.prepare("SELECT * FROM users WHERE email = ?").get(e),updateUserEmail:(e,r)=>{a.prepare("UPDATE users SET email = ? WHERE id = ?").run(r,e)},updatePlaybackSpeed:(e,r)=>{a.prepare("UPDATE users SET playback_speed = ? WHERE id = ?").run(r,e)},getProgress:e=>s.prepare("SELECT * FROM user_progress WHERE user_id = ? ORDER BY updated_at DESC").all(e),getProgressWithBooks:e=>s.prepare(`SELECT p.*, b.title, b.author, b.type
         FROM user_progress p
         JOIN books b ON p.book_id = b.id
         WHERE p.user_id = ?
         ORDER BY p.updated_at DESC`).all(e),upsertProgress:(e,r,t,s)=>{a.prepare(`INSERT INTO user_progress (user_id, book_id, chapter_number, audio_position_ms, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT (user_id, book_id) DO UPDATE SET
           chapter_number = excluded.chapter_number,
           audio_position_ms = excluded.audio_position_ms,
           updated_at = excluded.updated_at`).run(e,r,t,s)},getMessages:(e,r)=>s.prepare("SELECT * FROM messages WHERE user_id = ? AND book_id = ? ORDER BY id").all(e,r),insertMessage:(e,r,t,s,o="completed",E=null)=>a.prepare("INSERT INTO messages (user_id, book_id, role, text, status, model) VALUES (?, ?, ?, ?, ?, ?) RETURNING *").get(e,r,t,s,o,E),getBookStats:()=>s.prepare(`SELECT c.book_id,
                COUNT(*) as chapter_count,
                SUM(COALESCE(c.audio_duration_ms, src.audio_duration_ms)) as total_duration_ms,
                COALESCE(SUM(
                  (SELECT SUM(LENGTH(s.text)) FROM segments s
                   WHERE s.chapter_id = COALESCE(c.source_chapter_id, c.id)
                   AND s.segment_type = 'text')
                ), 0) as total_chars,
                SUM(CASE WHEN c.chapter_type = 'discussion' THEN 1 ELSE 0 END) as discussion_count
         FROM chapters c
         LEFT JOIN chapters src ON c.source_chapter_id = src.id
         GROUP BY c.book_id`).all(),updateMessage:(e,r,t)=>{a.prepare("UPDATE messages SET text = ?, status = ? WHERE id = ?").run(r,t,e)},getAnnotations:(e,r,t)=>a.prepare("SELECT * FROM annotations WHERE user_id = ? AND book_id = ? AND chapter_number = ? ORDER BY id").all(e,r,t),insertAnnotation:(e,r,t,s,o,E,i,d,p="yellow",n=null)=>a.prepare(`INSERT INTO annotations
          (user_id, book_id, chapter_number, start_segment_seq, start_char, end_segment_seq, end_char, type, color, comment_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).get(e,r,t,s,o,E,i,d,p,n),updateAnnotationComment:(e,r,t)=>a.prepare("UPDATE annotations SET comment_text = ? WHERE id = ? AND user_id = ?").run(t,e,r).changes>0,deleteAnnotation:(e,r)=>a.prepare("DELETE FROM annotations WHERE id = ? AND user_id = ?").run(e,r).changes>0,extendOrCreateSession:(e,r,t,s,o)=>{if(o<=0)return;let E=a.prepare(`SELECT id, ended_at FROM user_sessions
         WHERE user_id = ? AND book_id = ? AND chapter_number = ? AND mode = ?
         ORDER BY ended_at DESC LIMIT 1`).get(e,r,t,s);E&&(Date.now()-new Date(E.ended_at+"Z").getTime())/1e3<30?a.prepare(`UPDATE user_sessions
           SET duration_ms = duration_ms + ?, ended_at = datetime('now')
           WHERE id = ?`).run(o,E.id):a.prepare(`INSERT INTO user_sessions (user_id, book_id, chapter_number, mode, duration_ms)
           VALUES (?, ?, ?, ?, ?)`).run(e,r,t,s,o)},getUserUsageSummary:(e,r)=>{let t=r?[e,`${r}-01`,`${r}-01`]:[e],s=a.prepare(`SELECT mode, COALESCE(SUM(duration_ms), 0) as total_ms
         FROM user_sessions ${r?"WHERE user_id = ? AND started_at >= ? AND started_at < date(?, '+1 month')":"WHERE user_id = ?"} GROUP BY mode`).all(...t),o={listen_ms:0,read_ms:0};for(let e of s)"listen"===e.mode?o.listen_ms=e.total_ms:"read"===e.mode&&(o.read_ms=e.total_ms);return o},getCourseBookIds:e=>s.prepare(`
        SELECT sc.book_id, MIN(cc.number) as first_appearance
        FROM chapters cc
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        WHERE cc.book_id = ?
        GROUP BY sc.book_id
        ORDER BY first_appearance
      `).all(e).map(e=>e.book_id),getCoursesForBook:e=>s.prepare(`
        SELECT DISTINCT b.id as course_id, b.title as course_title
        FROM books b
        JOIN chapters cc ON cc.book_id = b.id
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        WHERE b.type = 'course' AND sc.book_id = ?
      `).all(e),getEnrolledCourseForBook:(e,r)=>{let t=s.prepare(`
        SELECT b.id as course_id, b.title as course_title, up.chapter_number
        FROM books b
        JOIN chapters cc ON cc.book_id = b.id
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        JOIN user_progress up ON up.book_id = b.id AND up.user_id = ?
        WHERE b.type = 'course' AND sc.book_id = ?
        LIMIT 1
      `).get(e,r);return t?{courseId:t.course_id,courseTitle:t.course_title,currentCourseChapter:t.chapter_number}:null}}])},44915,e=>{"use strict";let r=new Map;"u">typeof setInterval&&setInterval(()=>{let e=Date.now();for(let[t,s]of r)s.expiresAt<e&&r.delete(t)},6e4),e.s(["magicLinkTokens",0,r])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__614e290d._.js.map