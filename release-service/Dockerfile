FROM node:20-alpine

WORKDIR /app

COPY . .

CMD ["node", "--dns-result-order=ipv4first", "index.js"]
