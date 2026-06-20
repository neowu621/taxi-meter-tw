# 多階段建置：Node 建置 → nginx 提供靜態檔
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Zeabur 預設 HTTP 服務埠為 8080，nginx 需監聽此埠
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
