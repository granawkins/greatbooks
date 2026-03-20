module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},14747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},85148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},43793,e=>{"use strict";var t=e.i(85148);let r=e.i(14747).default.join(process.cwd(),"greatbooks.db"),a=new t.default(r,{readonly:!0});a.pragma("foreign_keys = ON");let s=new t.default(r);s.pragma("foreign_keys = ON"),s.pragma("busy_timeout = 5000"),s.exec(`
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
`);try{s.exec("ALTER TABLE books ADD COLUMN type TEXT DEFAULT 'book'")}catch{}try{s.exec("ALTER TABLE users ADD COLUMN playback_speed REAL DEFAULT 1.0")}catch{}s.exec(`
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
`);try{s.exec("ALTER TABLE chapters ADD COLUMN source_chapter_id INTEGER")}catch{}try{s.exec("ALTER TABLE chapters ADD COLUMN chapter_type TEXT DEFAULT 'text'")}catch{}e.s(["db",0,{getBooks:e=>e?a.prepare("SELECT * FROM books WHERE type = ?").all(e):a.prepare("SELECT * FROM books").all(),getBook:e=>a.prepare("SELECT * FROM books WHERE id = ?").get(e),getChapters:e=>a.prepare("SELECT * FROM chapters WHERE book_id = ? ORDER BY number").all(e),getChapter:(e,t)=>a.prepare("SELECT * FROM chapters WHERE book_id = ? AND number = ?").get(e,t),getSegments:e=>{let t=a.prepare("SELECT source_chapter_id FROM chapters WHERE id = ?").get(e),r=t?.source_chapter_id??e;return a.prepare("SELECT * FROM segments WHERE chapter_id = ? ORDER BY sequence").all(r)},getSourceBookInfo:(e,t)=>{let r=a.prepare("SELECT source_chapter_id FROM chapters WHERE book_id = ? AND number = ?").get(e,t);if(!r?.source_chapter_id)return null;let s=a.prepare("SELECT book_id, number FROM chapters WHERE id = ?").get(r.source_chapter_id);return s?{bookId:s.book_id,chapterNumber:s.number}:null},getResolvedChapter:e=>{let t=a.prepare("SELECT * FROM chapters WHERE id = ?").get(e);if(t){if(t.source_chapter_id){let e=a.prepare("SELECT * FROM chapters WHERE id = ?").get(t.source_chapter_id);if(e)return{...t,audio_file:e.audio_file,audio_duration_ms:e.audio_duration_ms}}return t}},upsertUser:e=>{s.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(e)},getUser:e=>a.prepare("SELECT * FROM users WHERE id = ?").get(e),getUserByEmail:e=>a.prepare("SELECT * FROM users WHERE email = ?").get(e),updateUserEmail:(e,t)=>{s.prepare("UPDATE users SET email = ? WHERE id = ?").run(t,e)},updatePlaybackSpeed:(e,t)=>{s.prepare("UPDATE users SET playback_speed = ? WHERE id = ?").run(t,e)},getProgress:e=>a.prepare("SELECT * FROM user_progress WHERE user_id = ? ORDER BY updated_at DESC").all(e),getProgressWithBooks:e=>a.prepare(`SELECT p.*, b.title, b.author, b.type
         FROM user_progress p
         JOIN books b ON p.book_id = b.id
         WHERE p.user_id = ?
         ORDER BY p.updated_at DESC`).all(e),upsertProgress:(e,t,r,a)=>{s.prepare(`INSERT INTO user_progress (user_id, book_id, chapter_number, audio_position_ms, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT (user_id, book_id) DO UPDATE SET
           chapter_number = excluded.chapter_number,
           audio_position_ms = excluded.audio_position_ms,
           updated_at = excluded.updated_at`).run(e,t,r,a)},getMessages:(e,t)=>a.prepare("SELECT * FROM messages WHERE user_id = ? AND book_id = ? ORDER BY id").all(e,t),insertMessage:(e,t,r,a,o="completed",n=null)=>s.prepare("INSERT INTO messages (user_id, book_id, role, text, status, model) VALUES (?, ?, ?, ?, ?, ?) RETURNING *").get(e,t,r,a,o,n),getBookStats:()=>a.prepare(`SELECT c.book_id,
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
         GROUP BY c.book_id`).all(),updateMessage:(e,t,r)=>{s.prepare("UPDATE messages SET text = ?, status = ? WHERE id = ?").run(t,r,e)},getAnnotations:(e,t,r)=>s.prepare("SELECT * FROM annotations WHERE user_id = ? AND book_id = ? AND chapter_number = ? ORDER BY id").all(e,t,r),insertAnnotation:(e,t,r,a,o,n,i,d,p="yellow",u=null)=>s.prepare(`INSERT INTO annotations
          (user_id, book_id, chapter_number, start_segment_seq, start_char, end_segment_seq, end_char, type, color, comment_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).get(e,t,r,a,o,n,i,d,p,u),updateAnnotationComment:(e,t,r)=>s.prepare("UPDATE annotations SET comment_text = ? WHERE id = ? AND user_id = ?").run(r,e,t).changes>0,deleteAnnotation:(e,t)=>s.prepare("DELETE FROM annotations WHERE id = ? AND user_id = ?").run(e,t).changes>0,extendOrCreateSession:(e,t,r,a,o)=>{if(o<=0)return;let n=s.prepare(`SELECT id, ended_at FROM user_sessions
         WHERE user_id = ? AND book_id = ? AND chapter_number = ? AND mode = ?
         ORDER BY ended_at DESC LIMIT 1`).get(e,t,r,a);n&&(Date.now()-new Date(n.ended_at+"Z").getTime())/1e3<30?s.prepare(`UPDATE user_sessions
           SET duration_ms = duration_ms + ?, ended_at = datetime('now')
           WHERE id = ?`).run(o,n.id):s.prepare(`INSERT INTO user_sessions (user_id, book_id, chapter_number, mode, duration_ms)
           VALUES (?, ?, ?, ?, ?)`).run(e,t,r,a,o)},getUserUsageSummary:(e,t)=>{let r=t?[e,`${t}-01`,`${t}-01`]:[e],a=s.prepare(`SELECT mode, COALESCE(SUM(duration_ms), 0) as total_ms
         FROM user_sessions ${t?"WHERE user_id = ? AND started_at >= ? AND started_at < date(?, '+1 month')":"WHERE user_id = ?"} GROUP BY mode`).all(...r),o={listen_ms:0,read_ms:0};for(let e of a)"listen"===e.mode?o.listen_ms=e.total_ms:"read"===e.mode&&(o.read_ms=e.total_ms);return o},getCourseBookIds:e=>a.prepare(`
        SELECT sc.book_id, MIN(cc.number) as first_appearance
        FROM chapters cc
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        WHERE cc.book_id = ?
        GROUP BY sc.book_id
        ORDER BY first_appearance
      `).all(e).map(e=>e.book_id),getCoursesForBook:e=>a.prepare(`
        SELECT DISTINCT b.id as course_id, b.title as course_title
        FROM books b
        JOIN chapters cc ON cc.book_id = b.id
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        WHERE b.type = 'course' AND sc.book_id = ?
      `).all(e),getEnrolledCourseForBook:(e,t)=>{let r=a.prepare(`
        SELECT b.id as course_id, b.title as course_title, up.chapter_number
        FROM books b
        JOIN chapters cc ON cc.book_id = b.id
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        JOIN user_progress up ON up.book_id = b.id AND up.user_id = ?
        WHERE b.type = 'course' AND sc.book_id = ?
        LIMIT 1
      `).get(e,t);return r?{courseId:r.course_id,courseTitle:r.course_title,currentCourseChapter:r.chapter_number}:null}}])},49019,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),s=e.i(59756),o=e.i(61916),n=e.i(74677),i=e.i(69741),d=e.i(16795),p=e.i(87718),u=e.i(95169),E=e.i(47587),c=e.i(66012),l=e.i(70101),_=e.i(26937),R=e.i(10372),T=e.i(93695);e.i(52474);var N=e.i(220),h=e.i(89171),m=e.i(43793);async function b(){let e=m.db.getBooks();return h.NextResponse.json(e,{headers:{"Cache-Control":"public, max-age=3600, stale-while-revalidate=86400"}})}e.s(["GET",()=>b],89876);var O=e.i(89876);let g=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/books/route",pathname:"/api/books",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/books/route.ts",nextConfigOutput:"",userland:O}),{workAsyncStorage:C,workUnitAsyncStorage:L,serverHooks:A}=g;function x(){return(0,a.patchFetch)({workAsyncStorage:C,workUnitAsyncStorage:L})}async function S(e,t,a){g.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/books/route";h=h.replace(/\/index$/,"")||"/";let m=await g.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:b,params:O,nextConfig:C,parsedUrl:L,isDraftMode:A,prerenderManifest:x,routerServerContext:S,isOnDemandRevalidate:k,revalidateOnlyGenerated:I,resolvedPathname:U,clientReferenceManifest:D,serverActionsManifest:f}=m,y=(0,i.normalizeAppPath)(h),v=!!(x.dynamicRoutes[y]||x.routes[U]),M=async()=>((null==S?void 0:S.render404)?await S.render404(e,t,L,!1):t.end("This page could not be found"),null);if(v&&!A){let e=!!x.routes[U],t=x.dynamicRoutes[y];if(t&&!1===t.fallback&&!e){if(C.experimental.adapterPath)return await M();throw new T.NoFallbackError}}let w=null;!v||g.isDev||A||(w="/index"===(w=U)?"/":w);let F=!0===g.isDev||!v,H=v&&!F;f&&D&&(0,n.setManifestsSingleton)({page:h,clientReferenceManifest:D,serverActionsManifest:f});let P=e.method||"GET",W=(0,o.getTracer)(),B=W.getActiveScopeSpan(),q={params:O,prerenderManifest:x,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts},cacheComponents:!!C.cacheComponents,supportsDynamicResponse:F,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:C.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>g.onRequestError(e,t,a,s,S)},sharedContext:{buildId:b}},X=new d.NodeNextRequest(e),G=new d.NodeNextResponse(t),j=p.NextRequestAdapter.fromNodeNextRequest(X,(0,p.signalFromNodeResponse)(t));try{let n=async e=>g.handle(j,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=W.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${P} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${h}`)}),i=!!(0,s.getRequestMeta)(e,"minimalMode"),d=async s=>{var o,d;let p=async({previousCacheEntry:r})=>{try{if(!i&&k&&I&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await n(s);e.fetchMetrics=q.renderOpts.fetchMetrics;let d=q.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let p=q.renderOpts.collectedTags;if(!v)return await (0,c.sendResponse)(X,G,o,q.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,l.toNodeOutgoingHttpHeaders)(o.headers);p&&(t[R.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=R.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,a=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=R.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:N.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await g.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:k})},!1,S),t}},u=await g.handleResponse({req:e,nextConfig:C,cacheKey:w,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:x,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:I,responseGenerator:p,waitUntil:a.waitUntil,isMinimalMode:i});if(!v)return null;if((null==u||null==(o=u.value)?void 0:o.kind)!==N.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",k?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let T=(0,l.fromNodeOutgoingHttpHeaders)(u.value.headers);return i&&v||T.delete(R.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||T.get("Cache-Control")||T.set("Cache-Control",(0,_.getCacheControlHeader)(u.cacheControl)),await (0,c.sendResponse)(X,G,new Response(u.value.body,{headers:T,status:u.value.status||200})),null};B?await d(B):await W.withPropagatedContext(e.headers,()=>W.trace(u.BaseServerSpan.handleRequest,{spanName:`${P} ${h}`,kind:o.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof T.NoFallbackError||await g.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:k})},!1,S),v)throw t;return await (0,c.sendResponse)(X,G,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>x,"routeModule",()=>g,"serverHooks",()=>A,"workAsyncStorage",()=>C,"workUnitAsyncStorage",()=>L],49019)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__f75b0b4d._.js.map