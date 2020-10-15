#!/bin/bash

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

echo "Detected package $PACKAGE_NAME v$PACKAGE_VERSION"

# Check docker user & token
if [[ ! -v DOCKER_USER ]]; then
    echo "ERROR: DOCKER_USER is not set"
    exit 1
else
    echo "Using user: $DOCKER_USER"
fi

if [[ ! -v DOCKER_TOKEN ]]; then
    echo "ERROR: DOCKER_TOKEN is not set"
    exit 1
fi

# Check if image was built
if [[ ! "docker images $DOCKER_USER/$PACKAGE_NAME:$PACKAGE_VERSION -q" ]]; then
    echo "ERROR: Image $DOCKER_USER/$PACKAGE_NAME:$PACKAGE_VERSION not found"
    exit 1
fi

# Set docker auth & context
docker context use default &>/dev/null
echo $DOCKER_TOKEN | docker login --username $DOCKER_USER --password-stdin

# Push to repo
echo "Pushing image..."
docker push $DOCKER_USER/$PACKAGE_NAME:$PACKAGE_VERSION
