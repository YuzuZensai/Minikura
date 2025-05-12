FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Copy source files
COPY src/ ./src/

# Install dependencies
RUN npm install

# Build
RUN npm run build

# Create production image
FROM node:18-alpine
WORKDIR /app

# Copy package.json and built files
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist

# Install production dependencies
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production

# Run
CMD ["node", "dist/index.js"] 