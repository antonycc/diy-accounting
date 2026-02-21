#!/bin/bash
# Preconditions (repository init):
#    python3 -m venv .
#    source ./bin/activate
#    python3 -m pip install openpyxl
#    pip3 install openpyxl
# Preconditions (repository checkout):
#    source ./bin/activate
# Usage:
#    ./update_links.sh './folder/with/spreadsheets'
# Example:
#    ./update_links.sh 'GB Accounts 2024-25/GB Accounts Company 2024-2025 (Any) Excel 2007'

echo "Work in progress, it breaks the files'
exit 1


# Check if directory name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <directory>"
  exit 1
fi

# Directory to search for .xlsx files
search_dir="$1"

# Find all .xlsx files 1-3 levels down and run the Python script for each
find "$search_dir" -type f -name "*.xlsx" -mindepth 1 -maxdepth 3 -exec python3 "$(dirname "$0")/update_links.py" {} \;

