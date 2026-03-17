#!/usr/bin/env python3
"""
Duplicate a slide within an unpacked PPTX directory.

Copies the slide XML and its .rels file, updates Content_Types.xml and
presentation.xml.rels, and prints the <p:sldId> element for manual insertion
into presentation.xml.

Usage:
    python add_slide.py unpacked_dir source_slide_number

Example:
    python add_slide.py my_presentation 2
    # Duplicates slide2.xml → slideN.xml (next available number)
    # Prints the <p:sldId> to paste into presentation.xml's <p:sldIdLst>
"""

import re
import shutil
import sys
from pathlib import Path
from xml.dom.minidom import parseString


def find_next_slide_number(slides_dir: Path) -> int:
    """Find the next available slide number."""
    existing = [
        int(m.group(1))
        for f in slides_dir.glob("slide*.xml")
        if (m := re.match(r"slide(\d+)\.xml", f.name))
    ]
    return max(existing, default=0) + 1


def find_next_rid(rels_path: Path) -> tuple:
    """Find the next available rId number in a .rels file and return (number, current_max_id)."""
    if not rels_path.exists():
        return 1, 0

    content = rels_path.read_text(encoding="utf-8")
    ids = [int(m) for m in re.findall(r'Id="rId(\d+)"', content)]
    max_id = max(ids, default=0)
    return max_id + 1, max_id


def find_next_sld_id(presentation_xml: Path) -> int:
    """Find the next available sldId in presentation.xml."""
    content = presentation_xml.read_text(encoding="utf-8")
    ids = [int(m) for m in re.findall(r'id="(\d+)"', content)]
    # sldId values start at 256 by convention
    return max(ids, default=255) + 1


def add_slide(unpacked_dir: str, source_slide_num: int) -> dict:
    """
    Duplicate a slide in an unpacked PPTX directory.

    Args:
        unpacked_dir: Path to the unpacked PPTX directory
        source_slide_num: Slide number to duplicate (1-based)

    Returns:
        Dict with 'new_slide_number', 'new_slide_file', 'sld_id_element'
    """
    base = Path(unpacked_dir).resolve()
    slides_dir = base / "ppt" / "slides"
    rels_dir = slides_dir / "_rels"

    # Validate source slide exists
    source_slide = slides_dir / f"slide{source_slide_num}.xml"
    if not source_slide.exists():
        raise FileNotFoundError(f"Source slide not found: {source_slide}")

    # Determine new slide number
    new_num = find_next_slide_number(slides_dir)
    new_slide = slides_dir / f"slide{new_num}.xml"

    # 1. Copy slide XML
    shutil.copy2(source_slide, new_slide)

    # 2. Copy slide .rels if it exists
    source_rels = rels_dir / f"slide{source_slide_num}.xml.rels"
    if source_rels.exists():
        new_rels = rels_dir / f"slide{new_num}.xml.rels"
        shutil.copy2(source_rels, new_rels)

    # 3. Add relationship in presentation.xml.rels
    pres_rels = base / "ppt" / "_rels" / "presentation.xml.rels"
    if pres_rels.exists():
        next_rid, _ = find_next_rid(pres_rels)
        rid = f"rId{next_rid}"
        new_rel = (
            f'<Relationship Id="{rid}" '
            f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" '
            f'Target="slides/slide{new_num}.xml"/>'
        )

        content = pres_rels.read_text(encoding="utf-8")
        # Insert before closing </Relationships>
        content = content.replace("</Relationships>", f"{new_rel}</Relationships>")
        pres_rels.write_text(content, encoding="utf-8")
    else:
        rid = "rId1"

    # 4. Add to [Content_Types].xml
    content_types = base / "[Content_Types].xml"
    if content_types.exists():
        ct_content = content_types.read_text(encoding="utf-8")
        new_override = (
            f'<Override PartName="/ppt/slides/slide{new_num}.xml" '
            f'ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        )
        # Only add if not already present
        if f"slide{new_num}.xml" not in ct_content:
            ct_content = ct_content.replace("</Types>", f"{new_override}</Types>")
            content_types.write_text(ct_content, encoding="utf-8")

    # 5. Generate <p:sldId> element for manual insertion into presentation.xml
    pres_xml = base / "ppt" / "presentation.xml"
    sld_id = find_next_sld_id(pres_xml)
    sld_id_element = f'<p:sldId id="{sld_id}" r:id="{rid}"/>'

    result = {
        "new_slide_number": new_num,
        "new_slide_file": str(new_slide.relative_to(base)),
        "sld_id_element": sld_id_element,
    }

    print(f"Duplicated slide{source_slide_num}.xml → slide{new_num}.xml")
    print(f"Added relationship: {rid}")
    print(f"\nInsert this into <p:sldIdLst> in ppt/presentation.xml:")
    print(f"  {sld_id_element}")

    return result


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python add_slide.py unpacked_dir source_slide_number")
        sys.exit(1)

    unpacked = sys.argv[1]
    source_num = int(sys.argv[2])
    add_slide(unpacked, source_num)
