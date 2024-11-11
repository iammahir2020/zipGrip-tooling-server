# Use the official Node.js image as a base
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json ./
COPY .env.dev ./.env

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your application runs on (default 3000)
EXPOSE 5000

# Command to run the app
CMD ["node", "index.js"]