FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY scripts/install-cloudflared.cjs ./scripts/install-cloudflared.cjs

ENV SKIP_CLOUDFLARED=1
RUN npm install --omit=dev

COPY proxy.cjs start.cjs db_helper.cjs discover_project.cjs ./

ENV NODE_ENV=production
ENV PORT=3000
ENV AUTH_DB_PATH=/data/auth/state.vscdb
ENV ENABLE_QUICK_TUNNEL=false

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/v1/models').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
