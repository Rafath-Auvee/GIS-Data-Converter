# Development image for the Next.js frontend.
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching). package-lock.json is optional.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Bind to 0.0.0.0 so the dev server is reachable from the host.
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
