# OnlineLounge Frontend

Phaser 3 multiplayer web game client for OnlineLounge. Deployed as a static site on S3. Connects to the DrawVidverse backend (world server + matchmaker) via WebSocket.

## Development

### Prerequisites

- Node.js 16+
- Backend running separately (from `drawvidverse` project)

### Quick Start

```bash
# Install dependencies
npm install

# Development: Start webpack-dev-server with hot reloading
npm run dev
# Opens automatically on http://localhost:8080
```

This will:

1. Start webpack-dev-server on port 8080 with hot module reloading
2. Automatically open in your browser
3. Connect to production world server and matchmaker

### Scripts

- `npm run dev` - Start webpack-dev-server (development with hot reload)
- `npm run build` - Production webpack bundle (optimized)
- `npm run build:dev` - Development webpack bundle (sourcemaps)
- `npm run deploy` - Build + deploy to S3 CloudFront CDN

### Environment Variables

Before running dev, optionally override backend URLs:

```bash
# These will be injected into the static HTML at build time
export WORLDSERVER_URL=ws://localhost:7778
export MATCHMAKER_URL=http://localhost:3000
npm run dev
```

Or pass via shell directly:

```bash
WORLDSERVER_URL=ws://localhost:7778 npm run dev
```

### Architecture

- **Frontend**: Phaser 3.90.0 + Webpack 5 + webpack-dev-server
- **Deployment**: S3 + CloudFront CDN (static site)
- **Backend**: Separate service (DrawVidverse WorldServer) - runs independently
- **Protocol**: WebSocket with JWT authentication
- **Development Server**: webpack-dev-server on localhost:8080 with hot reload

See [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) for technical details about WebSocket protocol and message format conversion.

## Deployment

```bash
npm run deploy
```

This:

1. Builds the production bundle (optimized, minified)
2. Uploads to S3
3. Invalidates CloudFront cache

Requires AWS credentials configured for the `drawvid` profile.
