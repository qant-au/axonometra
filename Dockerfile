# syntax=docker/dockerfile:1.7
#
# Standalone Axonometra SPA image. Builds the React app and serves
# the static bundle from nginx-unprivileged on port 8080. Host port
# mapping is managed by `restart.sh` (defaults to 4890 — see the
# reserved 4890-4899 range for this project).
#
# TRANSITIONAL: Stage 2 ships this CRA-flavoured Dockerfile so the
# audit can establish a baseline. Stage 3 will swap CRA for Vite and
# update the build script + output dir (build/ → dist/).

FROM node:22.22-alpine AS build

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

# CRA-style build (Stage 3 switches this to `vite build` and DIST_DIR
# below to `dist`).
RUN npm run build

# nginx-unprivileged: runs as the `nginx` user (uid 101) and listens
# on 8080 out of the box, so the container ships without ever starting
# a root-owned process. Pinned to the nginx stable line.
FROM nginxinc/nginx-unprivileged:1.30-alpine

COPY --chown=nginx:nginx docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/build /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
