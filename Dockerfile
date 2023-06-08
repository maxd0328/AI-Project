
# Inherit from Node.js 18
FROM node:18

# Set working directory to /app
WORKDIR /app

# Copy Yarn workspace configuration
COPY package.json ./
COPY yarn.lock ./

# Copy server package info and necessary dependencies
RUN mkdir express-server
RUN mkdir server-lib
RUN mkdir ms-compiler
COPY express-server/package.json ./express-server
COPY server-lib/package.json ./server-lib
COPY ms-compiler/package.json ./ms-compiler

# Install dependencies
RUN yarn install

# Copy source of server and dependencies
COPY express-server ./express-server
COPY server-lib ./server-lib
COPY ms-compiler ./ms-compiler

# Establish run script
CMD [ "node", "./express-server/www" ]
