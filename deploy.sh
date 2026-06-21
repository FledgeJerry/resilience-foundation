#!/bin/bash
# resilience.foundation deploy — build on Mac, rsync to Pi
# Usage: ./deploy.sh

PI="pivision@100.95.158.115"
PI_PATH="/media/pivision/Elements/resilience-foundation"

echo "==> Building on Mac..."
npm run build

echo "==> Syncing .next to Pi..."
rsync -az --delete --exclude='node_modules' .next/ "$PI:$PI_PATH/.next/"

echo "==> Syncing .next/node_modules to Pi..."
rsync -az .next/node_modules/ "$PI:$PI_PATH/.next/node_modules/"

echo "==> Restarting on Pi..."
ssh "$PI" "source ~/.nvm/nvm.sh && pm2 restart resilience-foundation --update-env"

echo "==> Done. Verify: curl -s http://localhost:3002 | grep title"
