#!/usr/bin/env python3
"""
Simplify tracked changes (redlines) in DOCX XML.

Merges adjacent <w:ins> or <w:del> elements from the same author into single
elements. This makes the XML cleaner and easier to read/edit.

Only merges truly adjacent elements — won't merge across paragraph boundaries
or when other elements intervene.
"""

from pathlib import Path

try:
    import lxml.etree
except ImportError:
    raise ImportError("lxml is required. Install with: pip install lxml --break-system-packages")


NS_WML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def get_author(elem) -> str:
    """Get the w:author attribute from a tracked change element."""
    return elem.get(f"{{{NS_WML}}}author", "")


def get_date(elem) -> str:
    """Get the w:date attribute from a tracked change element."""
    return elem.get(f"{{{NS_WML}}}date", "")


def simplify_in_paragraph(para_elem) -> int:
    """
    Merge adjacent tracked change elements within a paragraph.

    Merges adjacent <w:ins> or <w:del> elements from the same author.
    Returns the number of merges performed.
    """
    merges = 0
    children = list(para_elem)

    i = 0
    while i < len(children) - 1:
        current = children[i]
        next_elem = children[i + 1]

        current_tag = current.tag.split("}")[-1] if "}" in current.tag else current.tag
        next_tag = next_elem.tag.split("}")[-1] if "}" in next_elem.tag else next_elem.tag

        # Both must be the same tracked change type (ins or del)
        if current_tag not in ("ins", "del") or current_tag != next_tag:
            i += 1
            continue

        # Same author
        if get_author(current) != get_author(next_elem):
            i += 1
            continue

        # Merge: move all children from next_elem into current
        for child in list(next_elem):
            current.append(child)

        # Remove the next element
        para_elem.remove(next_elem)
        children = list(para_elem)
        merges += 1
        # Don't increment — check if we can merge again

    return merges


def simplify_redlines_in_file(xml_path: Path) -> int:
    """Simplify tracked changes in a single XML file. Returns merge count."""
    try:
        tree = lxml.etree.parse(str(xml_path))
        root = tree.getroot()
        total_merges = 0

        # Process each paragraph
        for para in root.iter(f"{{{NS_WML}}}p"):
            total_merges += simplify_in_paragraph(para)

        if total_merges > 0:
            tree.write(str(xml_path), xml_declaration=True, encoding="UTF-8", standalone=True)

        return total_merges
    except Exception:
        return 0


def simplify_redlines_in_directory(unpacked_dir) -> int:
    """Simplify redlines in all XML files in an unpacked DOCX directory. Returns file count."""
    unpacked_dir = Path(unpacked_dir)
    files_modified = 0

    for xml_file in unpacked_dir.rglob("*.xml"):
        merges = simplify_redlines_in_file(xml_file)
        if merges > 0:
            files_modified += 1

    return files_modified
