#!/bin/bash

# Check DOCKER_USER env var
if [[ ! -v DOCKER_USER ]]; then
    echo "ERROR: DOCKER_USER is not set"
    exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

if [[ ! -f "$ROOT_DIR/package.json" ]]; then
    echo "ERROR: package.json not found"
    exit 1
fi

# Get package info
PACKAGE_VERSION=$(cat $ROOT_DIR/package.json |
    grep version |
    head -1 |
    awk -F: '{ print $2 }' |
    sed 's/[",]//g' |
    tr -d '[[:space:]]')

PACKAGE_NAME=$(cat $ROOT_DIR/package.json |
    grep name |
    head -1 |
    awk -F: '{ print $2 }' |
    sed 's/[",]//g' |
    tr -d '[[:space:]]')

echo "Detected package $PACKAGE_NAME $PACKAGE_VERSION"

# Set docker context
docker context use default &>/dev/null

cd $ROOT_DIR

yarn "BUILD"

# Build image
echo "Building image $DOCKER_USER/$PACKAGE_NAME:$PACKAGE_VERSION..."
docker build . -f ./.docker/Dockerfile -t $DOCKER_USER/$PACKAGE_NAME:$PACKAGE_VERSION
