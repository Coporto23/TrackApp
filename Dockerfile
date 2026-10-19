# Imagen de producción de TrackApp (QA y Producción). Dos destinos:
#   app      servidor Next.js mínimo (output "standalone"), usuario no root, puerto 3000
#   migrate  dependencias completas + prisma/ para `prisma migrate deploy`
# Sin secretos: DATABASE_URL, AUTH_SECRET, etc. llegan en tiempo de ejecución.
# Uso: docker build --target app -t trackapp . / docker build --target migrate -t trackapp-migrate .

FROM node:24.21.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# OpenSSL: lo necesita el motor de migraciones de Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Dependencias (el postinstall genera el cliente de Prisma: necesita el esquema).
FROM base AS deps
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS migrate
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma7.config.ts ./
COPY prisma ./prisma
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
