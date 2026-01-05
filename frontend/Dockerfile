# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
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
