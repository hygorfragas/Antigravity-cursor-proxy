FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY scripts/install-cloudflared.cjs ./scripts/install-cloudflared.cjs

RUN npm install --omit=dev \
    && node scripts/install-cloudflared.cjs

COPY proxy.cjs start.cjs db_helper.cjs discover_project.cjs ./

ENV NODE_ENV=production
ENV PORT=3000
ENV AUTH_DB_PATH=/data/auth/state.vscdb

EXPOSE 3000

CMD ["npm", "start"]
