# -----------------------------------------------------------------------------
# Stage 1: Build Vite React Production Bundle
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy frontend source files
COPY . .

# Build production bundle
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve Production Assets with Nginx Alpine
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
