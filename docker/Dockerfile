FROM node:12-alpine

WORKDIR /app

COPY src/package*.json ./

RUN npm install

COPY src .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]