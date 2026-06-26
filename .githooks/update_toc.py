"""Auto-generate Table of Contents in a Markdown file."""
import re, sys
from pathlib import Path

DEFAULT_FILE = "docs/plans/PLAN_DEV.md"
TOC_LINE_RE = re.compile(r"^\s*-\s+\[.+\]\(#.+\)$")

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\u00e0-\u00ff\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text)
    return text

def build_toc(lines: list) -> list:
    toc = []
    in_sommaire = False
    in_code_block = False
    for line in lines:
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        m = re.match(r"^(#+)\s+(.+)$", line)
        if not m:
            continue
        level = len(m.group(1))
        title = m.group(2).strip()
        if title == "Sommaire":
            in_sommaire = True
            continue
        if in_sommaire and level == 2 and title != "Sommaire":
            in_sommaire = False
        if in_sommaire:
            continue
        anchor = slugify(title)
        indent = "  " * (level - 1)
        toc.append(f"{indent}- [{title}](#{anchor})")
    return toc

def is_toc_line(line: str) -> bool:
    return bool(TOC_LINE_RE.match(line))

def remove_orphan_tocs(lines: list) -> list:
    first_h2 = None
    for i, line in enumerate(lines):
        if re.match(r"^##\s", line):
            first_h2 = i
            break
    if first_h2 is None:
        return lines
    in_code_block = False
    filtered = []
    for i, line in enumerate(lines):
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            filtered.append(line)
            continue
        if not in_code_block and i < first_h2 and is_toc_line(line):
            continue
        filtered.append(line)
    return filtered

def remove_all_tocs(lines: list) -> list:
    return [line for line in lines if not re.match(r"^#+\s+Sommaire\s*$", line)]

def main():
    file_arg = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FILE
    file_path = Path(file_arg)
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    lines = remove_all_tocs(lines)
    lines = remove_orphan_tocs(lines)

    insert_at = 1
    toc_lines = build_toc(lines)
    if not toc_lines:
        print("No headings found for TOC")
        sys.exit(1)

    new_section = ["## Sommaire", ""] + toc_lines + [""]
    new_lines = lines[:insert_at] + new_section + lines[insert_at:]
    new_text = "\n".join(new_lines).strip() + "\n"
    file_path.write_text(new_text, encoding="utf-8")
    print(f"TOC updated in {file_path} ({len(toc_lines)} entries)")

if __name__ == "__main__":
    main()
