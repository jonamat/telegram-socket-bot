# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.155.1/containers/javascript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 14, 12, 10
# ARG VARIANT="14-buster"
# FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}
FROM node:15.8.0-alpine3.10

# Add v3.9 package repositories to get mongodb
RUN echo 'http://dl-cdn.alpinelinux.org/alpine/v3.9/main' >> /etc/apk/repositories && \
    echo 'http://dl-cdn.alpinelinux.org/alpine/v3.9/community' >> /etc/apk/repositories

# [Optional] Uncomment this section to install additional OS packages.
RUN apk update \
    && apk add git \
    && apk add nano

# Use system binaries for Mongo Memory Server
RUN apk add mongodb=4.0.5-r0 || true
ENV MONGOMS_SYSTEM_BINARY="/usr/bin/mongod"

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
RUN npm install -g npm-check-updates

# Add external node_modules binaries
ENV PATH="/node_modules/.bin/:${PATH}"
