FROM nginx

MAINTAINER DIY Accounting https://diyaccounting.co.uk/

# Static HTML in nginx doc root in Docker: http://localhost:8081/index.html
COPY ./index.html /usr/share/webapp
#ADD ./build /usr/share/webapp/zips
COPY ./build/* /usr/share/zips

COPY nginx.conf /etc/nginx/nginx.conf
