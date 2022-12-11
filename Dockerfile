# Purpose: DIY Accounting package zip files in nginx accessed from: http://localhost:80/index.html
# Usage:
#    $ docker build --tag diy-accounting .
#    $ docker image ls diy-accounting
#    $ docker run --interactive --tty diy-accounting bash
FROM nginx

MAINTAINER DIY Accounting https://diyaccounting.co.uk/

RUN mkdir -p /usr/share/webapp/zips
COPY ./index.html /usr/share/webapp
ADD ./build /usr/share/webapp/zips

RUN mkdir -p /etc/nginx/
COPY nginx.conf /etc/nginx/nginx.conf
