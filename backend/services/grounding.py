"""Tolerant-but-honest quote grounding.

A model's quoted evidence is accepted when it matches the source after
cosmetic normalisation (case, whitespace, curly quotes, dash variants,
surrounding quotes, trailing punctuation). Words are never changed or
fuzzily matched. The caller gets back the exact verbatim span of the source.
"""
import re
import unicodedata

_MIN_LENGTH = 3
_QUOTE_MAP = {
    "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'", "`": "'", "´": "'",
    "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"', "″": '"',
    "–": "-", "—": "-", "‒": "-", "―": "-", "−": "-", "‐": "-", "‑": "-",
}
_EDGE_QUOTES = "'\""
_TRAILING = ".,;:!?"
_ELISION = re.compile(r"\s*\.{3,}\s*")


def _norm_char(char: str) -> str:
    out = unicodedata.normalize("NFKC", char).casefold()
    return "".join(_QUOTE_MAP.get(c, c) for c in out)


def _normalise(text: str) -> tuple[str, list[int]]:
    """Return the normalised text and, per normalised char, its original index."""
    chars: list[str] = []
    index: list[int] = []
    for position, original in enumerate(text):
        for char in _norm_char(original):
            if char.isspace():
                if chars and chars[-1] == " ":
                    continue
                char = " "
            chars.append(char)
            index.append(position)
    return "".join(chars), index


def find_quote(quote: str, source: str, max_length: int | None = None) -> str | None:
    """Return the exact span of `source` matching `quote` under normalisation, else None.

    An ellipsis inside the quote is an elision: every piece must match, in order, and the
    returned span is the whole original passage from the first piece to the last, so the
    stored evidence is still the applicant's own unbroken words.
    """
    if not isinstance(quote, str) or not isinstance(source, str) or not quote.strip():
        return None
    needle, _ = _normalise(quote)
    # NFKC turns "…" into "..."; leading/trailing ellipses only mark truncation.
    needle = needle.strip(" " + _EDGE_QUOTES + ".").rstrip(" " + _EDGE_QUOTES + _TRAILING).lstrip(" " + _EDGE_QUOTES)
    pieces = [piece.strip(" ") for piece in _ELISION.split(needle)]
    if not pieces or any(len(piece) < _MIN_LENGTH for piece in pieces):
        return None
    haystack, index = _normalise(source)
    start = position = haystack.find(pieces[0])
    if start < 0:
        return None
    position += len(pieces[0])
    for piece in pieces[1:]:
        found = haystack.find(piece, position)
        if found < 0:
            return None
        position = found + len(piece)
    span = source[index[start]:index[position - 1] + 1]
    if max_length is not None and len(span) > max_length:
        return None
    return span
