#!/bin/sh

# Prepare development environment
# This script will run on container creation only

echo "Installing dependencies..."
# Place node_modules outside the volume to avoid slowing the filesystem on WSL systems
yarn install --ignore-scripts --modules-folder /node_modules

# TEMPORARILY DISABLED - use mongo system binaries - see startMongoMemoryServer.ts for details
# echo "Preparing mongo binaries for Mongo Memory Server..."
# node ./node_modules/ts-node/dist/bin.js ./scripts/checkMongoBinaries.ts
