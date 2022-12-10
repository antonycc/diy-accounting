# Purpose: DIY Accounting package zip files in nginx accessed from: http://localhost:8081/index.html
# Usage:
#    $ docker build --tag diy-accounting-zips .
#    $ docker image ls diy-accounting-zips
#    $ docker run --interactive --tty diy-accounting-zips bash
FROM nginx
#FROM ubuntu

MAINTAINER DIY Accounting https://diyaccounting.co.uk/

#RUN apt-get install -y nginx

RUN mkdir -p /usr/share/webapp/zips
COPY ./index.html /usr/share/webapp
ADD ./build /usr/share/webapp/zips
#RUN mkdir -p /usr/share/webapp
#COPY ./build/* /usr/share/webapp/zips

RUN mkdir -p /etc/nginx/
COPY nginx.conf /etc/nginx/nginx.conf
