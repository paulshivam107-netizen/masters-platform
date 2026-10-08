"""Bounded document extraction, executed as an isolated subprocess by the API.

No app imports, credentials, network calls or document files on disk.
"""
import io
import json
import re
import sys
import zipfile

MAX_BYTES = 5 * 1024 * 1024
MAX_CHARS = 20000


def extract(data, kind):
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Choose a non-empty resume under 5 MiB.")
    if kind == "txt":
        try:
            text = data.decode("utf-8-sig")
        except UnicodeError:
            raise ValueError("Save your text file as UTF-8, or paste the resume text instead.") from None
        if "\x00" in text:
            raise ValueError("This is not a readable text file.")
    elif kind == "pdf":
        if not data.startswith(b"%PDF-"):
            raise ValueError("This file is not a valid PDF.")
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise ValueError("Upload a PDF without password protection, or paste its text.")
        if len(reader.pages) > 10:
            raise ValueError("Use a resume of up to 10 pages.")
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
            if sum(map(len, parts)) > MAX_CHARS:
                raise ValueError("This document has too much text. Use a shorter resume or paste selected sections.")
        text = "\n".join(parts)
    elif kind == "docx":
        from defusedxml.ElementTree import fromstring
        if not data.startswith(b"PK\x03\x04"):
            raise ValueError("This file is not a valid DOCX document.")
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > 1000 or sum(item.file_size for item in entries) > 20 * 1024 * 1024:
                raise ValueError("This document is too complex. Export a simple PDF or paste its text.")
            entry = archive.getinfo("word/document.xml")
            if entry.file_size > 2 * 1024 * 1024:
                raise ValueError("This document has too much content. Paste the relevant sections instead.")
            document = fromstring(archive.read(entry), forbid_dtd=True, forbid_entities=True, forbid_external=True)
            ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            text = "\n".join(" ".join(t.text or "" for t in p.iter(ns + "t")) for p in document.iter(ns + "p"))
    else:
        raise ValueError("Use a PDF, DOCX or UTF-8 text file.")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text).strip()
    if len(text) > MAX_CHARS:
        raise ValueError("Keep the reviewed resume under 20,000 characters.")
    if len(text) < 80:
        raise ValueError("There is too little readable text. For a scan or image-only PDF, paste the resume text instead.")
    return text


def main():
    # POSIX limits protect the API worker from malformed/compressed documents.
    # A parent-enforced timeout also applies on platforms without resource limits.
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (8, 8))
        resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024, 768 * 1024 * 1024))
    except (ImportError, OSError, ValueError):
        pass
    try:
        result = {"text": extract(sys.stdin.buffer.read(MAX_BYTES + 1), sys.argv[1])}
    except ValueError as exc:
        result = {"error": str(exc) if type(exc) is ValueError else "This document could not be read. Paste its text instead."}
    except Exception:
        result = {"error": "This document could not be read. Export a new PDF or paste its text instead."}
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
