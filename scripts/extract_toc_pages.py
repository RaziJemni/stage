import sys
import json
import re
import pypdf

def extract_chapter_pages(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    found = {}
    # Scan from page index 2 (1-based page 3, after cover and TOC)
    for i in range(2, len(reader.pages)):
        text = reader.pages[i].extract_text() or ""
        for ch in range(1, 19):
            if ch not in found:
                # Match e.g. "CHAPTER 01 ·" or "CHAPITRE 01 ·"
                pattern = rf'(?:CHAPTER|CHAPITRE)\s+0?{ch}\s+·'
                if re.search(pattern, text, re.IGNORECASE):
                    found[ch] = i + 1
    return found

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("{}", file=sys.stderr)
        sys.exit(1)
    pdf_path = sys.argv[1]
    pages = extract_chapter_pages(pdf_path)
    print(json.dumps(pages))
