FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm install --omit=dev

# Install curl for dotenvx installation
RUN apk add --no-cache curl

# Install dotenvx
RUN curl -sfS https://dotenvx.sh/install.sh | sh

# Copy application source code
COPY . .

# Run the application
CMD ["dotenvx", "run", "--", "node", "src/index.js"]
