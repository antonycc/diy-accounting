#!/usr/bin/env bash
# Purpose: Build zip files for distribution
# Preconditions: Current directory is a working copy of DIY Accounting containing
# top level year folders like "GB Accounts 2010-11" and a folder called 'build'.
# Run as:
#    find <year root folder> -mindepth 1 -maxdepth 1 -type d -exec ./build-zip.sh {} \;
# e.g.
#    find GB*/ -mindepth 1 -maxdepth 1 -type d -exec './build-zip.sh' {} \;

# Functions
function zip_source_folder_to_file {
  local package_source_dir="$1"
  local zip_destination_dir="$2"
  local zip_destination_name="$3"

  echo "Zipping: [${package_source_dir?}] To: ${zip_destination_dir?}/${zip_destination_name?}.zip"

  # Zip the contents (but not the .git folder)
  rm -f "${zip_destination_dir?}/${zip_destination_name?}.zip"
  zip -r "${zip_destination_dir?}/${zip_destination_name?}.zip" * -q -X -1 -x "*/.git/*" "*.sh"
} 

# Parameters
zip_destination_dir='../../build'
source_dir=${1?}

# Constants
source_name=$(basename "${source_dir?}")
base_dir=$(pwd)

if [[ ! -f "${source_dir?}/DO NOT USE - WORK IN PROGRESS.txt" ]] ;
then

  # cd into the folder
  cd "${source_dir?}"

  # If this is the Any package, generate multiple zips
  if [[ $source_name == *"(Any) Excel 2007"* ]] ;
  then
    package="GB Accounts Company"
    format="Excel 2007"
    range=$(echo -n "${source_name?}" | sed -e 's/GB Accounts Company //' -e 's/ (Any) Excel 2007//')
    start_range=${range:0:4}
    end_range="${range:(-4)}"
    zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-04-30 (Apr${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-05-31" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-05-31 (May${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-06-30" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-06-30 (Jun${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-07-31" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-07-31 (Jul${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-08-31" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-08-31 (Aug${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-09-30" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-09-30 (Sep${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-10-31" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-10-31 (Oct${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-11-30" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-11-30 (Nov${start_range:(-2)}) ${format?}"
    echo "Skipping ${start_range?}-12-31" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${start_range?}-12-31 (Dec${start_range:(-2)}) ${format?}"
    echo "Skipping ${end_range?}-01-31"   ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${end_range?}-01-31 (Jan${end_range:(-2)}) ${format?}"
    # Lazy leap year check is correct between 2001 and 2099.
    if ! (( ${end_range?} % 4 )) ;
    then
      echo "Skipping ${end_range?}-02-29" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${end_range?}-02-29 (Feb${end_range:(-2)}) ${format?}"
    else
      echo "Skipping ${end_range?}-02-28" ; #zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${end_range?}-02-28 (Feb${end_range:(-2)}) ${format?}"
    fi
  else
    zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${source_name?}"
  fi

  # cd back
  cd "${base_dir?}"
else
  echo "Skipping: [${source_dir?}] because file DO NOT USE - WORK IN PROGRESS.txt exists"
fi
