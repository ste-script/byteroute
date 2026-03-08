#!/bin/sh
set -e

# Check for required environment variables
if [ -z "$MAXMIND_API_KEY" ] || [ -z "$MAXMIND_USER_ID" ]; then
  echo "ERROR: MAXMIND_API_KEY and MAXMIND_USER_ID environment variables must be set"
  echo "Please set these environment variables when starting the container:"
  echo "  docker run -e MAXMIND_API_KEY=your_key -e MAXMIND_USER_ID=your_id ..."
  exit 1
fi

# Report which domain DSL will be used
if [ -n "$DOMAIN_DSL_PATH" ]; then
  if [ -f "$DOMAIN_DSL_PATH" ]; then
    echo "Using domain DSL from DOMAIN_DSL_PATH: $DOMAIN_DSL_PATH"
  else
    echo "WARNING: DOMAIN_DSL_PATH is set to '$DOMAIN_DSL_PATH' but the file does not exist. Falling back to defaults."
  fi
elif [ -f "/etc/byteroute/domain.dsl.yaml" ]; then
  echo "Using domain DSL from /etc/byteroute/domain.dsl.yaml"
else
  echo "No custom domain DSL file found, using built-in defaults."
fi

# Download MaxMind databases
echo "Downloading MaxMind databases..."
cd apps/backend
node scripts/download-maxmind.mjs

# Start the Node.js server
echo "Starting Node.js server..."
exec node dist/index.js
