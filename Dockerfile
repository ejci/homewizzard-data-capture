FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Run the application
CMD ["node", "app.js"]
