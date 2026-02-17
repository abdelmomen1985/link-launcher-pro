FROM oven/bun:1.2.22

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "start"]
