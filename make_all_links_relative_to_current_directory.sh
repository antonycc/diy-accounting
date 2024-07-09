#!/bin/bash
# Preconditions:
#    python3 -m venv .
#    source ./bin/activate
#    python3 -m pip install openpyxl
#    pip3 install openpyxl
# Usage:
#    /make_all_links_relative_to_current_directory.sh './folder/with/spreadsheets'

# Check if directory name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <directory>"
  exit 1
fi

# Navigate to the specified directory
cd "$1" || exit

# Run the Python script to update links
python3 "$(dirname "$0")/make_all_links_relative_to_current_directory.py" "$1"
