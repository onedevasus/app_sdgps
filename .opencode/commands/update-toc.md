---
description: Met à jour le sommaire (TOC) de docs/plans/PLAN_DEV.md ou docs/notes/Notes.md
---

Usage: /update-toc <file>

Example: /update-toc docs/plans/PLAN_DEV.md
Example: /update-toc docs/notes/Notes.md

Run: python .githooks/update_toc.py $ARGUMENTS
Then: git add $ARGUMENTS
Verify: git diff --stat $ARGUMENTS

If no argument provided, defaults to docs/plans/PLAN_DEV.md.
