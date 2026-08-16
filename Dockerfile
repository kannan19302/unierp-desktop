# ============================================================
# UniERP Desktop App (Platform 10 · Port 4010)
# ============================================================

FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY public ./public

ENV NODE_ENV=development
ENV PORT=4010
ENV HOST=0.0.0.0

EXPOSE 4010

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]

FROM node:22-alpine AS runner
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=4010
ENV HOST=0.0.0.0

USER node
EXPOSE 4010

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
