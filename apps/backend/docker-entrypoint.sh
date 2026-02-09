#!/bin/sh
set -e

# Check for required environment variables
if [ -z "$MAXMIND_API_KEY" ] || [ -z "$MAXMIND_USER_ID" ]; then
  echo "ERROR: MAXMIND_API_KEY and MAXMIND_USER_ID environment variables must be set"
  echo "Please set these environment variables when starting the container:"
  echo "  docker run -e MAXMIND_API_KEY=your_key -e MAXMIND_USER_ID=your_id ..."
  exit 1
fi

# Download MaxMind databases
echo "Downloading MaxMind databases..."
cd apps/backend
node scripts/download-maxmind.mjs

# Start the Node.js server
echo "Starting Node.js server..."
exec node dist/index.js
