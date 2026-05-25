from pathlib import Path
import pypdf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assignment_requirements.txt"

pdfs = [
    "Final AI FT TASK -  Create a Startup Funding Web Form.pdf",
    "Python Full Stack Assignment (AI).pdf",
]

lines = []
for name in pdfs:
    path = ROOT / name
    lines.append("=" * 70)
    lines.append(name)
    lines.append("=" * 70)
    reader = pypdf.PdfReader(str(path))
    for i, page in enumerate(reader.pages):
        lines.append(f"\n--- PAGE {i + 1} ---\n")
        lines.append(page.extract_text() or "")
    lines.append("\n")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {OUT}")
