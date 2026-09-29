# syntax=docker/dockerfile:1.7
#
# Standalone Axonometra SPA image. A Node 22 stage runs the Vite build
# (`tsc --noEmit && vite build` → /app/dist); the runtime stage serves
# that static bundle from nginx-unprivileged on port 8080. Host port
# mapping is managed by `restart.sh` (defaults to 4890 — see the
# reserved 4890-4899 range for this project).

# Tag: node:22.22-alpine · Refreshed: 2026-09-29
# Refresh: docker buildx imagetools inspect node:22.22-alpine  (use the top-level Digest)
FROM node:22.22-alpine@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS build

WORKDIR /app

# Copy lockfile + manifest first so the dep install layer is cached
# against package-lock.json content rather than busted by every
# source change.
COPY package.json package-lock.json ./

# Raise npm's network timeout + retries before `npm ci`. Defaults
# (~60s, 2 retries) drop the build on slower networks under registry
# latency spikes; 10 minutes + 5 retries is the upstream-recommended
# setting for CI environments and a no-op on fast networks.
RUN npm config set fetch-timeout 600000 \
    && npm config set fetch-retries 5

# `npm ci` for deterministic installs that fail closed on lockfile drift.
RUN npm ci

# Rest of the source. Build context is shaped by .dockerignore.
COPY . .

# Vite build → /app/dist.
RUN npm run build

# nginx-unprivileged: runs as the `nginx` user (uid 101) and listens
# on 8080 out of the box, so the container ships without ever starting
# a root-owned process. Pinned to the nginx stable line.
# Tag: nginxinc/nginx-unprivileged:1.30-alpine · Refreshed: 2026-09-29
# Refresh: docker buildx imagetools inspect nginxinc/nginx-unprivileged:1.30-alpine  (use the top-level Digest)
FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:ed04ec1ff34502c339ee5c3ae3f855442398edc1d05591e2b98981dcbbd20b1e

COPY --chown=nginx:nginx docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
