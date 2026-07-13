# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend and backend
# This will run Vite build and Esbuild compilation
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files to install production dependencies
COPY package*.json ./

# Install ONLY production dependencies (no devDependencies like esbuild/typescript/vite)
RUN npm ci --omit=dev

# Copy compiled files from builder stage
COPY --from=builder /app/dist ./dist
# Copy static configurations/seeds
COPY --from=builder /app/database.json ./database.json
COPY --from=builder /app/firebase-applet-config.json* ./

# Create uploads folder for local filesystem fallback
RUN mkdir -p /app/uploads

# Expose port 3000 (used by Express server)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
