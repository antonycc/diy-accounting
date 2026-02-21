#!/usr/bin/env bash
# Purpose: Rebuild the package zips
# Usage:
#    build.sh
# Examples:
#    ./build.sh 

rm -rf './build'
mkdir -p './build'

#find 'IE Accounts 2007' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'IE Accounts 2008' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'IE Accounts 2009' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2006-07' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2007-08' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2008-09' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2009-10' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2010-11' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2011-12' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2012-13' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2013-14' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2014-15' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2015-16' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2016-17' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2017-18' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
#find 'GB Accounts 2018-19' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;

find 'GB Accounts 2019-20' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
find 'GB Accounts 2020-21' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
find 'GB Accounts 2021-22' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
find 'GB Accounts 2022-23' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
find 'GB Accounts 2023-24' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
find 'GB Accounts 2024-25' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;
find 'GB Accounts 2025-26' -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' "{}" \;

ls -lrt './build'

cat './index.html' | sed '$d' | sed '$d' | sed '$d' | sed '$d' > './build/index.html'
cd './build'
echo "<ol>" >> './index.html'
echo "Package,Platform,Status,Legacy" > './catalogue.csv'
ls -1 *.zip | while read line; do
  echo "<li><a href=\"$line\">$line</a></li>" >> './index.html'
  echo "$line" >> './index.txt'
  catalogue_line="${line/) Excel/),Excel}"
  echo "${catalogue_line/.zip/,released,unused}" >> './catalogue.csv'
done
echo "</ol>" >> './index.html'
echo "</body>" >> './index.html'
echo "</html>" >> './index.html'
cat './index.html'
cd ..
