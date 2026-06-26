"""Auto-generate Table of Contents in a Markdown file."""
import re, sys
from pathlib import Path

DEFAULT_FILE = "docs/plans/PLAN_DEV.md"

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
        prefix = "-"
        toc.append(f"{indent}{prefix} [{title}](#{anchor})")
    return toc

def find_toc_range(lines: list) -> tuple | None:
    start = None
    for i, line in enumerate(lines):
        if re.match(r"^##\s+Sommaire\s*$", line):
            start = i
            break
    if start is None:
        return None
    end = start + 1
    for i in range(start + 1, len(lines)):
        if re.match(r"^##\s", lines[i]) and not re.match(r"^##\s+Sommaire", lines[i]):
            end = i
            break
    else:
        end = len(lines)
    return (start, end)

def find_insert_position(lines: list) -> int | None:
    for i, line in enumerate(lines):
        if re.match(r"^#\s+\S", line) and not line.strip() == "# Sommaire":
            for j in range(i + 1, len(lines)):
                if re.match(r"^#\s+\S", lines[j]) and not lines[j].strip() == "# Sommaire":
                    return j
            return len(lines)
    return None

def main():
    file_arg = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FILE
    file_path = Path(file_arg)
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    toc_range = find_toc_range(lines)

    if toc_range is None:
        insert_at = find_insert_position(lines)
        if insert_at is None:
            print("Cannot find insertion point for Sommaire")
            sys.exit(1)
        start = insert_at
        end = insert_at
        insert_mode = True
    else:
        start, end = toc_range
        insert_mode = False

    toc_lines = build_toc(lines)
    if not toc_lines:
        print("No headings found for TOC")
        sys.exit(1)

    new_section = ["## Sommaire", ""] + [l for l in toc_lines] + [""]
    new_lines = lines[:start] + new_section + lines[end:]
    new_text = "\n".join(new_lines).strip() + "\n"
    file_path.write_text(new_text, encoding="utf-8")
    action = "created" if insert_mode else "updated"
    print(f"TOC {action} in {file_path} ({len(toc_lines)} entries)")

if __name__ == "__main__":
    main()
