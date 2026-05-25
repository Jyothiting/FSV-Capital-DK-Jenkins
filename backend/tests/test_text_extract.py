import os
import tempfile

import pytest

from services.text_extract import extract_txt_file, MAX_KB_FILE_BYTES


def test_extract_txt_file():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("Hello knowledge base.\nSecond line.")
        path = f.name
    try:
        assert "Hello knowledge base" in extract_txt_file(path)
    finally:
        os.remove(path)


def test_extract_pdf_rejects_oversized(tmp_path):
    from services.text_extract import extract_pdf_file

    big = tmp_path / "big.pdf"
    big.write_bytes(b"%PDF-1.4\n" + b"x" * (MAX_KB_FILE_BYTES + 1))
    with pytest.raises(ValueError, match="exceeds"):
        extract_pdf_file(str(big))
