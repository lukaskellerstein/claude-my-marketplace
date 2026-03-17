#!/usr/bin/env python3
"""
Merge adjacent <w:r> elements with identical <w:rPr> formatting in DOCX XML.

After unpacking a DOCX, Word often splits text into many small runs with identical
formatting. This helper merges them for easier reading and editing.

Also removes rsid attributes and proofErr markers that clutter the XML.
"""

import copy
from pathlib import Path

try:
    import lxml.etree
except ImportError:
    raise ImportError("lxml is required. Install with: pip install lxml --break-system-packages")


NS_WML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

# Attributes to strip before comparing run properties (these are tracking IDs, not formatting)
STRIP_ATTRS = {
    f"{{{NS_WML}}}rsidR",
    f"{{{NS_WML}}}rsidRPr",
    f"{{{NS_WML}}}rsidDel",
    f"{{{NS_WML}}}rsidP",
    f"{{{NS_WML}}}rsidRDefault",
}


def normalize_rpr(rpr_elem):
    """
    Create a normalized string representation of <w:rPr> for comparison.

    Strips rsid attributes and produces a canonical form.
    Returns empty string if rpr_elem is None.
    """
    if rpr_elem is None:
        return ""

    # Deep copy so we don't modify the original
    rpr = copy.deepcopy(rpr_elem)

    # Remove rsid attributes from the rPr element
    for attr in list(rpr.attrib.keys()):
        if attr in STRIP_ATTRS or "rsid" in attr.lower():
            del rpr.attrib[attr]

    # Remove rsid attributes from child elements
    for child in rpr.iter():
        for attr in list(child.attrib.keys()):
            if attr in STRIP_ATTRS or "rsid" in attr.lower():
                del child.attrib[attr]

    return lxml.etree.tostring(rpr, method="c14n2").decode("utf-8")


def get_run_text(run_elem) -> str:
    """Extract the text content from a <w:r> element."""
    texts = []
    for t in run_elem.findall(f"{{{NS_WML}}}t"):
        if t.text:
            texts.append(t.text)
    return "".join(texts)


def has_only_text(run_elem) -> bool:
    """Check if a run contains only rPr and t elements (no breaks, tabs, etc.)."""
    for child in run_elem:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        if tag not in ("rPr", "t"):
            return False
    return True


def merge_runs_in_element(parent_elem):
    """
    Merge adjacent <w:r> elements with identical formatting within a parent element.

    Modifies the parent in place. Returns the number of merges performed.
    """
    merges = 0
    children = list(parent_elem)

    i = 0
    while i < len(children) - 1:
        current = children[i]
        next_elem = children[i + 1]

        # Both must be <w:r> elements
        current_tag = current.tag.split("}")[-1] if "}" in current.tag else current.tag
        next_tag = next_elem.tag.split("}")[-1] if "}" in next_elem.tag else next_elem.tag

        if current_tag != "r" or next_tag != "r":
            i += 1
            continue

        # Both must contain only text (no breaks, drawings, etc.)
        if not has_only_text(current) or not has_only_text(next_elem):
            i += 1
            continue

        # Compare formatting
        current_rpr = current.find(f"{{{NS_WML}}}rPr")
        next_rpr = next_elem.find(f"{{{NS_WML}}}rPr")

        if normalize_rpr(current_rpr) != normalize_rpr(next_rpr):
            i += 1
            continue

        # Merge: append next's text to current's last <w:t>
        current_text = get_run_text(current)
        next_text = get_run_text(next_elem)
        merged_text = current_text + next_text

        # Remove existing <w:t> elements from current
        for t in current.findall(f"{{{NS_WML}}}t"):
            current.remove(t)

        # Add single merged <w:t>
        new_t = lxml.etree.SubElement(current, f"{{{NS_WML}}}t")
        new_t.text = merged_text
        if merged_text and (merged_text[0] == " " or merged_text[-1] == " "):
            new_t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")

        # Remove the next element
        parent_elem.remove(next_elem)
        children = list(parent_elem)
        merges += 1
        # Don't increment i — check if the merged run can merge with the next one too

    return merges


def merge_runs_in_file(xml_path: Path) -> int:
    """Merge adjacent runs in a single XML file. Returns merge count."""
    try:
        tree = lxml.etree.parse(str(xml_path))
        root = tree.getroot()
        total_merges = 0

        # Also remove proofErr elements (they clutter the XML)
        for proof_err in root.iter(f"{{{NS_WML}}}proofErr"):
            proof_err.getparent().remove(proof_err)

        # Remove rsid attributes from paragraph elements
        for elem in root.iter():
            for attr in list(elem.attrib.keys()):
                if "rsid" in attr.lower():
                    del elem.attrib[attr]

        # Merge runs within each paragraph
        for para in root.iter(f"{{{NS_WML}}}p"):
            total_merges += merge_runs_in_element(para)

        if total_merges > 0:
            tree.write(str(xml_path), xml_declaration=True, encoding="UTF-8", standalone=True)

        return total_merges
    except Exception:
        return 0


def merge_runs_in_directory(unpacked_dir) -> int:
    """Merge runs in all XML files in an unpacked DOCX directory. Returns file count."""
    unpacked_dir = Path(unpacked_dir)
    files_modified = 0

    for xml_file in unpacked_dir.rglob("*.xml"):
        merges = merge_runs_in_file(xml_file)
        if merges > 0:
            files_modified += 1

    return files_modified
