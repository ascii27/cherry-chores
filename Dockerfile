# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w web && npm run build -w api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV WEB_DIST=/app/web/dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/web/dist ./web/dist
EXPOSE 3000
CMD ["node", "api/dist/index.js"]
