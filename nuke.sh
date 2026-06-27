#!/bin/bash

echo "========================================"
echo "   ANONIMBUZ - FRESH START"
echo "========================================"
echo

# [1] Hentikan proses node yang masih berjalan
echo "[1/4] Stopping existing processes..."
killall node 2>/dev/null || true
sleep 1
echo "       Done."

# [2] Bersihkan semua cache
echo "[2/4] Nuking caches..."
rm -rf .wrangler web/dist web/node_modules/.vite node_modules/.cache web/node_modules/.cache
echo "       All caches cleared."

# [3] Rebuild frontend dari nol
echo "[3/4] Rebuilding frontend..."
cd web || exit
npm run build
BUILD_EXIT_CODE=$?
if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo
    echo "❌ Build failed! Check the errors above."
    cd ..
    exit $BUILD_EXIT_CODE
fi
cd ..
echo "       Build successful."

# [4] Jalankan Wrangler
echo "[4/4] Starting local server..."
echo
npx wrangler pages dev web/dist --port 8788