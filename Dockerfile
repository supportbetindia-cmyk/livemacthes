# One image, run twice by docker-compose: once as `next start`, once as the live-worker.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must be
# present during `next build` (passed as build args by docker-compose). Server-only
# secrets (tokens, service account) are injected at runtime via env_file instead.
ARG NEXT_PUBLIC_FIREBASE_DATABASE_URL
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET
ARG NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION
# robots.txt and sitemap.xml are generated at build time, so the site's own URL is needed here too.
ARG SITE_URL
ENV NEXT_PUBLIC_FIREBASE_DATABASE_URL=$NEXT_PUBLIC_FIREBASE_DATABASE_URL \
    NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID \
    NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET \
    NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION=$NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION \
    SITE_URL=$SITE_URL
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
# ponytail: ship the whole built app (incl. node_modules) so both `next start` and the
# worker script run as-is. Switch to output:"standalone" later if image size matters.
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
