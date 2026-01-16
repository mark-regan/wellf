# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (exclude package-lock.json for cross-arch compatibility)
COPY package.json ./

# Install dependencies fresh for this architecture
RUN npm install

# Copy source code (includes .env.production with VITE_API_URL)
COPY . .

# Remove any platform-specific modules and reinstall
RUN rm -rf node_modules/.cache && npm rebuild

# Build the application - Vite will read from .env.production
RUN npm run build

# Production stage
FROM nginx:alpine

ARG PORT=80

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Fix permissions for static files
RUN chmod -R 644 /usr/share/nginx/html/* && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \;

# Copy nginx configuration and set port
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE ${PORT}

CMD ["nginx", "-g", "daemon off;"]
