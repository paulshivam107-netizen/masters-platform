"""Tolerant-but-honest quote grounding.

A model's quoted evidence is accepted when it matches the source after
cosmetic normalisation (case, whitespace, curly quotes, dash variants,
surrounding quotes, trailing punctuation). Words are never changed or
fuzzily matched. The caller gets back the exact verbatim span of the source.
"""
import unicodedata

_MIN_LENGTH = 3
_QUOTE_MAP = {
    "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'", "`": "'", "´": "'",
    "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"', "″": '"',
    "–": "-", "—": "-", "‒": "-", "―": "-", "−": "-", "‐": "-", "‑": "-",
}
_EDGE_QUOTES = "'\""
_TRAILING = ".,;:!?"


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


def find_quote(quote: str, source: str) -> str | None:
    """Return the exact span of `source` matching `quote` under normalisation, else None."""
    if not isinstance(quote, str) or not isinstance(source, str) or not quote.strip():
        return None
    needle, _ = _normalise(quote)
    needle = needle.strip(" " + _EDGE_QUOTES)
    needle = needle.rstrip(" " + _EDGE_QUOTES + _TRAILING).lstrip(" " + _EDGE_QUOTES)
    if len(needle) < _MIN_LENGTH:
        return None
    haystack, index = _normalise(source)
    start = haystack.find(needle)
    if start < 0:
        return None
    first, last = index[start], index[start + len(needle) - 1]
    return source[first:last + 1]
