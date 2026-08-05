FROM node:18-alpine AS builder
WORKDIR /app
COPY ./package.json ./
RUN npm install
COPY . .

ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build

FROM nginx
EXPOSE 3000
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html