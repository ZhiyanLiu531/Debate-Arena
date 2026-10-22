FROM node:24-slim 

WORKDIR /home/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY ./src ./src

EXPOSE 3000
CMD ["node", "src/app.mjs"]