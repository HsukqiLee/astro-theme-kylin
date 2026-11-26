FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG SITE_URL=https://blog.tsinbei.com
ARG PUBLIC_RESOURCE_ORIGIN
ENV SITE_URL=$SITE_URL
ENV PUBLIC_RESOURCE_ORIGIN=$PUBLIC_RESOURCE_ORIGIN
RUN npm run check && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4433
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN chown node:node /app
USER node
EXPOSE 4433
CMD ["node", "./dist/server/entry.mjs"]
