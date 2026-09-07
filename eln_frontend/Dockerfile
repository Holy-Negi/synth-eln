# ---- ビルド段 ----
  FROM node:22-alpine AS build

  WORKDIR /app
  
  COPY eln_frontend/package.json eln_frontend/package-lock.json ./
  RUN npm ci
  
  COPY eln_frontend/ ./
  
  # ビルド時に API のベースパスを埋め込む
  ARG VITE_API_BASE=/api
  ENV VITE_API_BASE=$VITE_API_BASE
  RUN npm run build
  
  # ---- 配信段 ----
  FROM nginx:1.27-alpine
  
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY eln_frontend/nginx.conf /etc/nginx/conf.d/default.conf
  
  EXPOSE 80