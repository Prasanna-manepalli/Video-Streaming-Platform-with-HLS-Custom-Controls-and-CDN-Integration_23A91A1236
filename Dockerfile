FROM nginx:alpine

RUN apk add --no-cache curl

COPY . /usr/share/nginx/html

EXPOSE 80
