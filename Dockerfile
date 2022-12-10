# Static HTML in nginx doc root in Docker: http://localhost:8081/index.html
#FROM nginx
FROM ubuntu

MAINTAINER DIY Accounting https://diyaccounting.co.uk/

#RUN apt-get install -y nginx

RUN mkdir -p /usr/share/webapp
COPY ./index.html /usr/share/webapp
#ADD ./build /usr/share/webapp/zips
COPY ./build/* /usr/share/zips

RUN mkdir -p /etc/nginx/
COPY nginx.conf /etc/nginx/nginx.conf
