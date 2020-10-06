# Production Dockerfile
FROM node:15.8.0-alpine3.10
WORKDIR /app
COPY ./package.json ./.yarnrc ./yarn.lock ./prod.env ./
RUN yarn install --production --frozen-lockfile
COPY ./build/ ./build
CMD node ./build/index.js
