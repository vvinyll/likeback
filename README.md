# Xいいねビューア

A dependency-free Cloudflare Worker with an embedded Japanese frontend. No npm dependencies, build step, or static assets binding are required.

1. In the X developer portal, enable OAuth 2.0 for a confidential Web App. Set the callback URL to `https://<worker-host>/callback` and the website URL to your Worker origin. The app needs `tweet.read users.read like.read offline.access` scopes and X API access to liked tweets.
2. With the Wrangler CLI available, create a KV namespace using `wrangler kv namespace create SESSIONS`. Replace the placeholder `id` in `wrangler.toml` with the returned namespace ID.
3. Set secrets (use your OAuth 2.0 client credentials, not OAuth 1.0 API keys):

   ```sh
   wrangler secret put X_CLIENT_ID
   wrangler secret put X_CLIENT_SECRET
   wrangler secret put SESSION_SECRET
   ```

   Use a long, random SESSION_SECRET, for example from `openssl rand -hex 32`.
4. Verify with `node --check src/worker.js`. Preview with `wrangler dev`; use HTTPS for the OAuth flow because cookies are Secure. When ready, deploy explicitly with `wrangler deploy` and register its exact HTTPS callback URL in the X portal.

Open `mock.html` directly in a browser to preview seven fake posts, including one through four image layouts and a video preview. It uses the same frontend with `window.__MOCK__` data and makes no backend requests. Images load from picsum.photos.

The Worker stores PKCE transactions for 10 minutes, sessions for 30 days, and normalized likes for 5 minutes in SESSIONS KV. Access and refresh tokens stay in KV and are never returned to the browser. Expired access tokens are refreshed when likes are requested. OAuth state is also bound to the initiating browser using a short-lived HttpOnly cookie. Logout deletes the session and clears its cookie.

The API returns up to 500 liked posts (500件) in X's returned order (いいね順). 新しい順 sorts by post date; 人気順 sorts by like count. Search, author counts, statistics, and shuffle operate on these loaded posts. Videos and GIFs show preview images; opening a card plays them on X. Likes are fetched in up to five sequential pages of 100 posts using `meta.next_token` as `pagination_token`, stopping when there is no next token. Posts, included users, and media are merged and deduplicated before normalization. The full merged result is cached in `likes:<userId>` for five minutes. If a later page fails with an X API error, the gathered posts are returned and cached for only 60 seconds. A first-page rate limit returns HTTP 429 with a Japanese JSON error and Retry-After when supplied by X.

KV is eventually consistent: new sessions, cache updates, refreshes, and logout may take time to propagate across locations. This implementation does not fetch beyond 500 likes or serialize concurrent token refreshes.

Like categorization uses Workers AI (`@cf/meta/llama-3.1-8b-instruct-fast`) to classify uncached posts in sequential batches of up to 50 posts, with independent error handling for each batch. Up to 200 characters of each post and its ID are sent to the model. Missing or invalid predictions, unavailable AI, and AI failures fall back to Japanese/English keyword rules. The AI binding is configured in `wrangler.toml`. Workers AI includes 10,000 neurons/day free; exceeding that allowance may require a paid plan and incur charges.

Category chips filter the loaded likes and show counts across all loaded posts. Each card, including the featured card, has a category badge for manual changes. Missing categories appear as その他; mock mode changes stay local. `/api/likes` includes `categories` and each post's `category` and `category_source` (`ai`, `rules`, or `manual`). Categorization and manual overrides are reapplied even when likes come from the five-minute cache, without extra X API calls.

SESSIONS KV stores one `cats:<userId>` map as `{postId: {c: category, m: "ai" | "rules"}}`, read once per categorization and written once only when changed, without a TTL. AI entries never expire. Rules entries also include a millisecond timestamp `t` and are retried by AI after one day. The map is pruned to current post IDs and capped at 1000 entries. User overrides use `catov:<userId>` as a post ID to category map with no expiration. KV eventual consistency and concurrent updates also apply to manual overrides.

`POST /api/category` accepts JSON `{id, category}` with a valid signed session cookie, `Content-Type: application/json`, and an `Origin` matching the Worker origin. IDs must contain 1–25 digits and categories must match the `/api/likes` category list. Set `category` to `null` or `""` to remove an override and use automatic categorization again. Successful updates return `{ok: true}`.

The card grid renders progressively: about 50 posts first (extended to finish the last post's calendar day), then more as you scroll near the bottom (IntersectionObserver), with a もっと見る button fallback. Filters, search, and sort reset to the first chunk; all filtering still works on the full fetched set.

Timeline: the main view is a single centered column (max 600px), grouped by each post's created_at date in Asia/Tokyo with sticky headers like 2026年11月2日（月）, newest day first (the sort buttons order posts within a day). X's API does not expose when you liked a post, so grouping is by post date. Batches append whole date groups and keep loading while the bottom sentinel is visible.

「パーソナルカードを作る」 opens a 1200×630 canvas card with your taste type, a Japanese summary, a category radar chart, and the busiest posting weekday/hour in JST. Save it as `mylikes-card.png` or open X's share composer (the image is saved separately). Dates and activity describe the liked posts' creation times, since X does not provide the time you liked them.

`GET /api/summary` uses the same signed session, token refresh, likes cache, categories, and manual overrides as `/api/likes`. Exported `buildSummary(posts, user)` is pure and supplies the rules fallback, including empty-data handling. Workers AI receives only aggregate statistics and keywords for one friendly sentence; valid AI summaries are cached at `sum:<userId>:<JST YYYY-MM-DD>` for two days. Responses include `summary_source: "ai" | "rules"`. Mock previews can supply `window.__MOCK_SUMMARY__`; mock mode never requests a summary from the backend.

`GET /api/img?u=<encoded URL>` is a public, same-origin avatar proxy restricted to HTTPS `pbs.twimg.com` images smaller than 2 MiB. Redirects are rejected. Successful images have a public one-day cache header; other routes remain `no-store`. Card avatars use this proxy so PNG downloads remain possible, with initials when images fail or take longer than four seconds. `window.drawCard(canvas, summary, {imgSrc: url => url})` optionally changes image mapping for local previews; the default uses the proxy.

Run `node --check src/worker.js` and `node tools/render-sample.mjs` for a real-data preview. The renderer reads `/workspace/x-likes/data/likes.json`, classifies its first 500 posts using rules, extracts `drawCard` from the Worker's HTML response, and writes `/tmp/card-sample.html` without launching Chrome. Pass `--screenshot` to also render `/workspace/personal-card-sample-radar.png` with a 1200×630 Chrome window; this requires Chrome process/network permissions and write access to the screenshot directory. The sample uses direct user avatar URLs and M PLUS Rounded 1c and is intended for screenshots rather than PNG export.
