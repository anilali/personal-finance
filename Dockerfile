FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY package.json ./

EXPOSE 3000

CMD ["pnpm", "preview"]
