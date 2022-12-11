# diy-accounting

This is the home of DIY Accounting's community edition spreadsheet based packages. Formerly, these DIY Accounting 
spreadsheets were distributed as a set of proprietary products, owned by DIY Accounting Limited and created by 
Terry Cartwright in the early 2000s. The spreadsheets are now Open Source and released under the Mozilla Public 
License Version 2.0. See: https://www.mozilla.org/en-US/MPL/2.0/  

# The relationship to DIY Accounting Limited

https://www.diyaccounting.co.uk/

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
$ docker run --dettach --publish 8081:80 ghcr.io/antonycc/diy-accounting:main
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
