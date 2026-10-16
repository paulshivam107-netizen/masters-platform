# DEVELOPMENT ONLY (docker-compose): runs the CRA dev server with hot reload.
# Production serves the static build from Cloudflare Pages; see docs/DEPLOYMENT.md.
# Never expose this container publicly.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
