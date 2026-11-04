Build a Cloudflare Worker (ES module, NO npm deps, NO build step) in this directory:
- src/worker.js : single file. Embed the frontend HTML/CSS/JS as a template string served at GET / (so it deploys as one module; no static assets binding).
- wrangler.toml (name="xlikes", main="src/worker.js", compatibility_date="2025-10-01", kv_namespaces binding SESSIONS with placeholder id).
- README.md (setup: X dev portal callback URL https://<worker-host>/callback, secrets X_CLIENT_ID, X_CLIENT_SECRET, SESSION_SECRET).
- mock.html : the same frontend but with window.__MOCK__ data (5-8 fake posts incl. 1,2,3,4 images using https://picsum.photos/seed/N/600/400 and one video) so it renders without backend.

Routes:
- GET /login: OAuth 2.0 Authorization Code + PKCE (S256) to https://x.com/i/oauth2/authorize, scopes "tweet.read users.read like.read offline.access", random state; store {verifier,state} in KV (key "pkce:"+state, ttl 600). redirect_uri = origin + "/callback".
- GET /callback: verify state, exchange code at https://api.x.com/2/oauth2/token (Basic auth with X_CLIENT_ID:X_CLIENT_SECRET, confidential client), get /2/users/me, create random session id, store {access_token, refresh_token, expires_at, user} in KV "sess:"+id (ttl 30 days). Cookie "sid" = id + "." + HMAC-SHA256(SESSION_SECRET, id) base64url; HttpOnly; Secure; SameSite=Lax; Path=/. Tokens NEVER sent to browser.
- GET /api/me -> {user} or 401.
- GET /api/likes: verify cookie signature, load session, refresh token if expired (grant_type=refresh_token), call GET https://api.x.com/2/users/:id/liked_tweets?max_results=100&expansions=author_id,attachments.media_keys&user.fields=profile_image_url,name,username&media.fields=url,preview_image_url,type,width,height&tweet.fields=created_at,public_metrics,entities,attachments . Cache result in KV "likes:"+userId ttl 300. Return normalized JSON {user, posts:[{id,text,created_at,metrics:{reply,repost,like,view},author:{name,username,avatar},media:[{type,url}]}]}. Propagate X rate-limit (429) as JSON error.
- GET /logout: delete session from KV, clear cookie, redirect /.
- If X_CLIENT_ID missing: / shows setup message, /login returns 503 explaining.
- Security headers (CSP allowing img-src https://pbs.twimg.com https://picsum.photos data:, script inline ok via nonce or 'unsafe-inline').

Frontend (Japanese UI, title "Xいいねビューア"): if not logged in show landing with "Xでログイン" button. Logged in: header with user avatar/@name and ログアウト. Cards faithfully like an x.com post: 40px round avatar, bold name, gray @username · date (e.g. 10月31日), full text with pre-wrap, links/#hashtags/@mentions/$cashtags in #1d9bf0 (escape HTML!), media in X 1/2/3/4 grid (rounded 16px, object-fit cover, fixed heights, 3 = tall left + 2 right), video/GIF with centered play badge, footer reply/repost/like/view counts with inline SVG icons, card white bg, 1px #eff3f4 border, 16px radius; prefers-color-scheme dark support. Masonry via CSS columns (column-width 340px). Sections: 今日の一枚 (random post with media, シャッフル button), controls: search input, author select (with counts), sort segmented いいね順/新しい順/人気順. Metrics row: 件数, 投稿者数, 画像付き. Card click opens https://x.com/<username>/status/<id> in new tab. Loading and error states.
Keep code clean. Do not deploy anything. Verify syntax with `node --check src/worker.js`.
