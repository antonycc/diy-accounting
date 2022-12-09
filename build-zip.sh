#!/usr/bin/env bash
# Purpose: Build zip files for distribution
# Preconditions: Current directory is a working copy of DIY Accounting containing
# top level year folders like "GB Accounts 2010-11" and a folder called 'build'.
# Run as:
#    find <year root folder> -mindepth 1 -maxdepth 1 -type d -exec ./build-zip.sh {} \;
# e.g.
#    find GB*/ -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' {} \;

# Parameters
DESTINATION_DIR='../../build'
SOURCE_DIR=${1?}

# Constants
SOURCE_NAME=$(basename "${SOURCE_DIR?}")
BASE_DIR=$(pwd)

if [[ ! -f "${SOURCE_DIR?}/DO NOT USE - WORK IN PROGRESS.txt" ]] ;
then
  echo "Zipping: [${SOURCE_DIR?}] To: ${DESTINATION_DIR?}/${SOURCE_NAME?}.zip"

  # cd into the folder
  cd "${SOURCE_DIR?}"

  # Zip the contents (but not the .git folder)
  rm -f "${DESTINATION_DIR?}/${SOURCE_NAME?}.zip"
  zip -r "${DESTINATION_DIR?}/${SOURCE_NAME?}.zip" * -q -X -1 -x "*/.git/*" "*.sh"

  # cd back
  cd "${BASE_DIR?}"
else
  echo "Skipping: [${SOURCE_DIR?}] because file DO NOT USE - WORK IN PROGRESS.txt exists"
fi
