# diy-accounting

This is the home of DIY Accounting's community edition spreadsheet based packages. Formerly, these DIY Accounting 
spreadsheets were distributed as a set of proprietary products, owned by DIY Accounting Limited and created by 
Terry Cartwright in the early 2000s. The spreadsheets are now Open Source and released under the Mozilla Public 
License Version 2.0. See: https://www.mozilla.org/en-US/MPL/2.0/  

# The relationship to DIY Accounting Limited

https://www.spreadsheets.diyaccounting.co.uk/

DIY Accounting Limited continues to maintain these packages and remains a for-profit company. DIY Accounting Limited 
shall be releasing new proprietary products in the future and if you wish to help with our running costs while we do
this, you can click the sponsor link above or send a donation here:
https://www.paypal.com/donate/?hosted_button_id=XTEQ73HM52QQW

# Getting help with DIY Accounting

As proprietary software support was supplied by email and staffed part-time. There is no longer a support service and
users are encouraged to start a discussion here: https://github.com/antonycc/diy-accounting/discussions or raise
an issue here https://github.com/antonycc/diy-accounting/issues .

# Examples

Access all DIY Accounting packages in a docker container:
```shell
$ docker pull ghcr.io/antonycc/diy-accounting:main
main: Pulling from antonycc/diy-accounting
025c56f98b67: Already exists 
ca9c7f45d396: Already exists 
ed6bd111fc08: Already exists 
e25b13a5f70d: Already exists 
9bbabac55ab6: Already exists 
e5c9ba265ded: Already exists 
a67f63fc24a8: Pull complete 
4be0cda7ed80: Pull complete 
10fd142c791b: Pull complete 
4f4fb700ef54: Pull complete 
337acd6a890f: Pull complete 
Digest: sha256:81e2faebef2ae9c42aa9bdae92ff340aa57a625fd0c9adaf16d71bdbd3343bff
Status: Downloaded newer image for ghcr.io/antonycc/diy-accounting:main
ghcr.io/antonycc/diy-accounting:main
$ docker run --detach --publish 8081:80 ghcr.io/antonycc/diy-accounting:main
0169c58a65c1db885252bfb044091e371734e778442b6a8047f9d34cf2b49818
$ curl --include 'http://localhost:8081/zips/packages.txt' | head -15
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  9923  100  9923    0     0  1218k      0 --:--:-- --:--:-- --:--:-- 4845k
HTTP/1.1 200 OK
Server: nginx/1.23.2
Date: Sun, 11 Dec 2022 00:47:34 GMT
Content-Type: text/plain
Content-Length: 9923
Last-Modified: Sun, 11 Dec 2022 00:39:31 GMT
Connection: keep-alive
ETag: "639526c3-26c3"
Accept-Ranges: bytes

GB Accounts Basic Sole Trader 2019-04-05 (Apr19) Excel 2003.zip
GB Accounts Basic Sole Trader 2019-04-05 (Apr19) Excel 2007.zip
GB Accounts Basic Sole Trader 2020-04-05 (Apr20) Excel 2003.zip
GB Accounts Basic Sole Trader 2020-04-05 (Apr20) Excel 2007.zip
GB Accounts Basic Sole Trader 2021-04-05 (Apr21) Excel 2003.zip
```

# TODO

* Convert docs to online content such as a wiki or GitHub pages
* Contribution guidelines
* Ensure index page is well-formed
