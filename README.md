# OnlineLounge

2D multiplayer browser game. Live at [onlinelounge.drawvid.com](https://onlinelounge.drawvid.com).

## Quick Start

```bash
npm install
WORLDSERVER_URL=ws://localhost:7778 npm run dev
# Opens http://localhost:8080
```

The worldserver must be running separately. From the `drawvidverse` repo:

```bash
npm run dev:onlinelounge --workspace=worldserver
```

## Scripts

- `npm run dev` — webpack-dev-server on port 8080 (set `WORLDSERVER_URL` env var for local backend)
- `npm run build` — Production webpack bundle
- `npm run build:dev` — Development bundle with sourcemaps

## Deploy

```bash
./deploy.sh
```

Builds with webpack, uploads to S3 (`onlinelounge-drawvid-frontend-593615615124`), invalidates CloudFront (`E3E6AK9OMDPA7M`).

## Architecture

- **Framework**: Phaser 3.90.0 + Webpack 5
- **Frontend CDN**: CloudFront → onlinelounge.drawvid.com
- **World server**: wss://world-lounge.drawvid.com (nginx → PM2 on Lightsail, port 7778)
- **Auth**: Open access — no JWT required

## World Server URL Config

The server URL is baked in at build time via webpack and also set at runtime in `index.html`. If you change the server URL, update **both**:

1. `public/index.html` — `window.WORLDSERVER_URL`
2. `public/webpack.config.js` — production fallback in `DefinePlugin`

Then redeploy.
