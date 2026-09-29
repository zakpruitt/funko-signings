import json
import re
import sys
from pathlib import Path

GUIDES = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "data-pages"
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "voice-credits.json"

actors = {}
for page in sorted(GUIDES.glob("*/index.html")):
    html = page.read_text(encoding="utf8")
    match = re.search(r"const DATA\s*=\s*", html)
    if not match:
        continue
    data, _ = json.JSONDecoder().raw_decode(html[match.end():])
    for person in data:
        credits = actors.setdefault(person["name"], {})
        for rows in person["cats"].values():
            for row in rows:
                role = (row.get("r") or "").strip()
                title = (row.get("t") or "").strip()
                if role and title:
                    credits[(role, title)] = [role, title]

out = [{"name": name, "roles": list(credits.values())} for name, credits in sorted(actors.items())]
OUTPUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
print(f"Wrote {len(out)} actors, {sum(len(a['roles']) for a in out)} roles to {OUTPUT.name}")
