FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]