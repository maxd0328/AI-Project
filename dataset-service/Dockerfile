
# Set parent image to Node.js 14
FROM node:14

# Specify a working directory for this image
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install necessary dependencies from package
RUN npm install

# Copy all server files
# Refer to .dockerignore for ignored files
COPY . .

# Start the server
CMD [ "npm", "start" ]
