FROM node:20-alpine

WORKDIR /app

COPY . .

EXPOSE 3000 50051

CMD ["node", "index.js"]
