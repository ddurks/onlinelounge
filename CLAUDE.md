# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Commit Messages

**Never mention Claude, AI, or any assistant tool in commit messages or code comments.**

Write commit messages as the developer: describe what changed and why, not who or what wrote it.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: OnlineLounge

2D multiplayer browser game frontend. Phaser 3 + Webpack. Connects directly to the drawvidverse worldserver via WebSocket — no matchmaker.

### Stack

- **Framework**: Phaser 3.90.0
- **Bundler**: Webpack 5 + webpack-dev-server
- **Language**: JavaScript (CommonJS/ES modules mixed)
- **Live URL**: https://onlinelounge.drawvid.com

### Key Files

```
onlinelounge/
├── public/
│   ├── src/
│   │   └── WorldServerClient.js  # WebSocket client — auth + connection logic
│   ├── index.html                # Sets window.WORLDSERVER_URL at runtime
│   ├── webpack.config.js         # Bakes WORLDSERVER_URL into bundle at build time
│   └── app.bundle.js             # Built output (committed — don't edit directly)
└── deploy.sh                     # Build + S3 sync + CloudFront invalidation
```

### Connection Flow

Connects directly to `wss://world-lounge.drawvid.com` (nginx → ws://localhost:7778 on Lightsail).

The server URL is set in two places — **both must be kept in sync**:
1. `public/index.html` line ~50: `window.WORLDSERVER_URL = "wss://world-lounge.drawvid.com"`
2. `public/webpack.config.js` line ~33: production fallback URL

`WorldServerClient.js` reads from `process.env.WORLDSERVER_URL`, then `window.WORLDSERVER_URL`, then defaults.

No JWT auth — `getServerAssignment()` returns `jwt: "no-auth"` for non-localhost connections. The server accepts this because `JWT_SECRET` is not set on Lightsail.

Join is idempotent on the server — re-entering/leaving the lounge triggers a scene restart which re-emits join; the server re-sends `welcome` instead of erroring.

### Local Development

```bash
npm install
WORLDSERVER_URL=ws://localhost:7778 npm run dev
# Opens http://localhost:8080
```

The worldserver must be running separately (from drawvidverse repo):
```bash
npm run dev:onlinelounge --workspace=worldserver
```

### Deploy

```bash
./deploy.sh
```

Runs `npx webpack --mode production`, syncs to S3 bucket `onlinelounge-drawvid-frontend-593615615124`, invalidates CloudFront distribution `E3E6AK9OMDPA7M`.

### AWS Resources

- S3 bucket: `onlinelounge-drawvid-frontend-593615615124` (us-east-2, private, OAI access)
- CloudFront: `E3E6AK9OMDPA7M` → onlinelounge.drawvid.com
- World server DNS: world-lounge.drawvid.com → 3.142.214.211 (Lightsail)
