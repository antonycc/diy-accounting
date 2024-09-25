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
    cutoff_year="2025"
    range=$(echo -n "${source_name?}" | sed -e 's/GB Accounts Company //' -e 's/ (Any) Excel 2007//')
    start_range=${range:0:4}
    end_range="${range:(-4)}"
    first_year_end=$((start_range+1))
    second_year_end=$((end_range+1))
    echo "start_range: ${start_range?}, end_range: ${end_range?}, cutoff_year: ${cutoff_year?}"
    # TODO: Automate the current month logic
    if [[ ${end_range?} -eq ${cutoff_year?} ]] ;
    then
      echo "Only generate company zips up to the current month in year end_range ${end_range?} which is ${cutoff_year?}"
      #echo "Skipping ${start_range?}-04-30" ; zip_source.....
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-04-30 (Apr${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-05-31 (May${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-06-30 (Jun${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-07-31 (Jul${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-08-31 (Aug${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-09-30 (Sep${first_year_end:(-2)}) ${format?}"
      #echo "Skipping ${start_range?}--" ; zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-10-31 (Oct${first_year_end:(-2)}) ${format?}"
      #echo "Skipping ${start_range?}--" ; zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-11-30 (Nov${first_year_end:(-2)}) ${format?}"
      #echo "Skipping ${start_range?}--" ; zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-12-31 (Dec${first_year_end:(-2)}) ${format?}"
      #echo "Skipping ${end_range?}-01-31"   ;
      #echo "Skipping ${start_range?}--" ; zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${second_year_end?}-01-31 (Jan${second_year_end:(-2)}) ${format?}"
      # Lazy leap year check is correct between 2001 and 2099.
      #if ! (( ${end_range?} % 4 )) ;
      #then
        #echo "Skipping ${start_range?}--" ; zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${second_year_end?}-02-29 (Feb${second_year_end:(-2)}) ${format?}"
      #else
        #echo "Skipping ${start_range?}--" ; zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${second_year_end?}-02-28 (Feb${second_year_end:(-2)}) ${format?}"
      #fi
    else
      echo "For all other years including end_range ${end_range?}, generate all company zips which is not ${cutoff_year?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-04-30 (Apr${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-05-31 (May${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-06-30 (Jun${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-07-31 (Jul${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-08-31 (Aug${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-09-30 (Sep${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-10-31 (Oct${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-11-30 (Nov${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${first_year_end?}-12-31 (Dec${first_year_end:(-2)}) ${format?}"
      zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${second_year_end?}-01-31 (Jan${second_year_end:(-2)}) ${format?}"
      # Lazy leap year check is correct between 2001 and 2099.
      if ! (( ${end_range?} % 4 )) ;
      then
        zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${second_year_end?}-02-29 (Feb${second_year_end:(-2)}) ${format?}"
      else
        zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${package?} ${second_year_end?}-02-28 (Feb${second_year_end:(-2)}) ${format?}"
      fi
    fi
  else
    zip_source_folder_to_file "${source_dir?}" "${zip_destination_dir?}" "${source_name?}"
  fi

  # cd back
  cd "${base_dir?}"
else
  echo "Skipping: [${source_dir?}] because file DO NOT USE - WORK IN PROGRESS.txt exists"
fi
