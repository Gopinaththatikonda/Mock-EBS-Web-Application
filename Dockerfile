# APSRTC EBS Portal (Mock EBS) - Node.js / Express on port 8090
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=8090 \
    HOST=0.0.0.0

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Application source (see .dockerignore: no .env, node_modules or git data).
COPY --chown=node:node . .

# Run as the unprivileged "node" user provided by the official image.
USER node

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8090)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
