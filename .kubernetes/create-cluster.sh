#!/bin/bash

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Creating '$GCP_NAME' cluster in the '$GCP_PROJECT' project, located in '$GCP_ZONE' with $NUM_NODES x '$GCP_MACHINE_TYPE' node(s)\n"
read -rsp $'Press any key to continue\n' -n1 key

gcloud container clusters create "$GCP_NAME" \
    --zone "$GCP_ZONE" \
    --machine-type "$GCP_MACHINE_TYPE" \
    --num-nodes "$NUM_NODES" \
    --network "default" \
    --username "admin"

gcloud config set container/cluster $GCP_NAME
gcloud container clusters get-credentials $GCP_NAME

