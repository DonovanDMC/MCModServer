FROM node:18-alpine

ENV TZ=America/Chicago
WORKDIR /app
COPY . .
RUN apk add --no-cache git
RUN npm --no-update-notifier install --development
CMD node --no-warnings --no-deprecation --experimental-specifier-resolution=node --loader ts-node/esm /app/src/index.ts
