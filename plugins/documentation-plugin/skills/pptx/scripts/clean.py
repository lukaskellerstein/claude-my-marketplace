#!/usr/bin/env python3
"""
Clean an unpacked PPTX directory.

Removes slides not referenced in <p:sldIdLst>, removes unreferenced media files
and .rels entries, and updates [Content_Types].xml accordingly.

Usage:
    python clean.py unpacked_dir
"""

import re
import sys
from pathlib import Path


def get_referenced_slides(presentation_xml: Path) -> set:
    """Get the set of rIds referenced in <p:sldIdLst>."""
    content = presentation_xml.read_text(encoding="utf-8")

    # Extract everything inside <p:sldIdLst>...</p:sldIdLst>
    match = re.search(r"<p:sldIdLst>(.*?)</p:sldIdLst>", content, re.DOTALL)
    if not match:
        return set()

    return set(re.findall(r'r:id="(rId\d+)"', match.group(1)))


def get_slide_targets(pres_rels_path: Path) -> dict:
    """Get a mapping of rId → slide filename from presentation.xml.rels."""
    content = pres_rels_path.read_text(encoding="utf-8")
    mapping = {}
    for match in re.finditer(
        r'<Relationship\s+Id="(rId\d+)"\s+'
        r'Type="[^"]*relationships/slide"\s+'
        r'Target="([^"]+)"',
        content,
    ):
        rid, target = match.groups()
        # Target is relative to ppt/, e.g., "slides/slide1.xml"
        mapping[rid] = target
    return mapping


def get_media_refs_in_rels(rels_path: Path) -> set:
    """Get media file references from a .rels file."""
    if not rels_path.exists():
        return set()

    content = rels_path.read_text(encoding="utf-8")
    refs = set()
    for match in re.finditer(r'Target="([^"]*media/[^"]+)"', content):
        target = match.group(1)
        # Normalize relative paths (e.g., "../media/image1.png" → "media/image1.png")
        target = re.sub(r"^\.\./", "", target)
        refs.add(target)
    return refs


def clean_pptx(unpacked_dir: str) -> dict:
    """
    Clean an unpacked PPTX directory by removing unreferenced slides and media.

    Args:
        unpacked_dir: Path to the unpacked PPTX directory

    Returns:
        Dict with 'removed_slides', 'removed_media', 'removed_rels' counts
    """
    base = Path(unpacked_dir).resolve()
    ppt_dir = base / "ppt"
    slides_dir = ppt_dir / "slides"
    media_dir = ppt_dir / "media"
    pres_xml = ppt_dir / "presentation.xml"
    pres_rels = ppt_dir / "_rels" / "presentation.xml.rels"

    if not pres_xml.exists():
        raise FileNotFoundError(f"presentation.xml not found in {ppt_dir}")

    stats = {"removed_slides": 0, "removed_media": 0, "removed_rels": 0}

    # Step 1: Find which slides are referenced
    referenced_rids = get_referenced_slides(pres_xml)
    slide_targets = get_slide_targets(pres_rels)

    # Find slides to keep
    keep_slides = set()
    for rid in referenced_rids:
        if rid in slide_targets:
            target = slide_targets[rid]
            # e.g., "slides/slide1.xml" → "slide1.xml"
            slide_file = Path(target).name
            keep_slides.add(slide_file)

    # Step 2: Remove unreferenced slides
    if slides_dir.exists():
        for slide_file in slides_dir.glob("slide*.xml"):
            if slide_file.name not in keep_slides:
                print(f"Removing unreferenced slide: {slide_file.name}")
                slide_file.unlink()
                stats["removed_slides"] += 1

                # Remove corresponding .rels
                rels_file = slides_dir / "_rels" / f"{slide_file.name}.rels"
                if rels_file.exists():
                    rels_file.unlink()
                    stats["removed_rels"] += 1

    # Remove unreferenced slide relationships from presentation.xml.rels
    if pres_rels.exists():
        content = pres_rels.read_text(encoding="utf-8")
        for rid, target in slide_targets.items():
            if rid not in referenced_rids:
                # Remove the entire Relationship element
                pattern = rf'<Relationship\s+Id="{rid}"[^/]*/>'
                content = re.sub(pattern, "", content)
        pres_rels.write_text(content, encoding="utf-8")

    # Step 3: Find all media references across remaining slides
    all_media_refs = set()
    if slides_dir.exists():
        rels_dir = slides_dir / "_rels"
        if rels_dir.exists():
            for rels_file in rels_dir.glob("slide*.xml.rels"):
                all_media_refs.update(get_media_refs_in_rels(rels_file))

    # Also check slide layouts and masters for media refs
    for subdir in ["slideLayouts", "slideMasters"]:
        layout_rels = ppt_dir / subdir / "_rels"
        if layout_rels.exists():
            for rels_file in layout_rels.glob("*.rels"):
                all_media_refs.update(get_media_refs_in_rels(rels_file))

    # Step 4: Remove unreferenced media files
    if media_dir.exists():
        for media_file in media_dir.iterdir():
            if media_file.is_file():
                relative_name = f"media/{media_file.name}"
                if relative_name not in all_media_refs:
                    print(f"Removing unreferenced media: {media_file.name}")
                    media_file.unlink()
                    stats["removed_media"] += 1

    # Step 5: Update [Content_Types].xml
    content_types = base / "[Content_Types].xml"
    if content_types.exists():
        ct_content = content_types.read_text(encoding="utf-8")
        # Remove Override entries for deleted slides
        for slide_file in slides_dir.glob("slide*.xml"):
            pass  # Keep existing entries for remaining slides

        # Remove entries for slides that no longer exist
        existing_slides = {f.name for f in slides_dir.glob("slide*.xml")} if slides_dir.exists() else set()
        for match in re.finditer(
            r'<Override\s+PartName="/ppt/slides/(slide\d+\.xml)"[^/]*/>', ct_content
        ):
            if match.group(1) not in existing_slides:
                ct_content = ct_content.replace(match.group(0), "")

        content_types.write_text(ct_content, encoding="utf-8")

    print(f"\nCleaning complete:")
    print(f"  Removed {stats['removed_slides']} slides")
    print(f"  Removed {stats['removed_media']} media files")
    print(f"  Removed {stats['removed_rels']} .rels files")

    return stats


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python clean.py unpacked_dir")
        sys.exit(1)

    clean_pptx(sys.argv[1])
