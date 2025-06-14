FROM oven/bun:1.2.16-alpine

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY . .

RUN bun run build

RUN mkdir -p logs

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD kill -USR2 1 || exit 1

CMD ["bun", "start"]
