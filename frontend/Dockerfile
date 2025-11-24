# 1. Fázis: Buildelés (Node.js)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Fázis: Kiszolgálás (Nginx)
FROM nginx:alpine
# A buildelt fájlokat átmásoljuk az Nginx mappájába
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]