# Multi-stage build for React/Vite application

# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Optional: override at build with --build-arg (e.g. for local Supabase).
# If unset, the app uses its built-in fallback (hosted Supabase).
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (after package* so code changes don't bust npm ci cache)
COPY . .

# Build the application (uses ENV above; Vite inlines at build time)
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
