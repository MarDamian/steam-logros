# Imagen opcional: un solo proceso Node que sirve el frontend y la API.
# No hace falta para Cloudflare, Vercel ni Netlify.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Compila el frontend a dist/client y empaqueta el servidor en un único
# dist/server/node.mjs, así la imagen final no necesita node_modules.
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY --from=build /app/dist ./dist

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server/node.mjs"]
