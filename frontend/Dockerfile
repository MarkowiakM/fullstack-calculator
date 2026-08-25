# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Optional: VITE_* vars are inlined into the JS bundle at build time, not
# read at container start, so this must be a build ARG, not a compose
# `environment:` entry. Left unset, the API client falls back to a relative
# /api path, which is what the containerized setup actually uses (see
# nginx.conf) — this ARG only matters for pointing at a different backend.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1
