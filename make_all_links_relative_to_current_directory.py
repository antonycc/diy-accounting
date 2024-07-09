import openpyxl
import os
import sys

def update_hyperlinks(file_path):
    wb = openpyxl.load_workbook(file_path)
    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if cell.hyperlink:
                    link = cell.hyperlink.target
                    # Get the filename from the link
                    filename = os.path.basename(link)
                    # Update the hyperlink to just the filename
                    cell.hyperlink = filename
    wb.save(file_path)

def main():
    # Get the directory from command line arguments
    if len(sys.argv) != 2:
        print("Usage: update_links.py <directory>")
        sys.exit(1)

    directory = sys.argv[1]

    # Loop through all .xlsx files in the directory
    for filename in os.listdir(directory):
        if filename.endswith(".xlsx"):
            file_path = os.path.join(directory, filename)
            update_hyperlinks(file_path)
            print(f"Updated links in {filename}")

if __name__ == "__main__":
    main()
