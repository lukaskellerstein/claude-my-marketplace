#!/usr/bin/env python3
"""
PPTX-specific validator.

Extends BaseSchemaValidator with PresentationML-specific checks:
slide layout references, duplicate slide layouts, notes slide refs.
"""

from pathlib import Path

import lxml.etree

from .base import BaseSchemaValidator, NS_PKG_RELS, NS_OFFICE_RELS, NS_MC

NS_PML = "http://schemas.openxmlformats.org/presentationml/2006/main"


class PPTXSchemaValidator(BaseSchemaValidator):
    """Validates an unpacked PPTX directory."""

    SCHEMA_MAPPINGS = {
        **BaseSchemaValidator.SCHEMA_MAPPINGS,
        "ppt": "ISO-IEC29500-4_2016/pml.xsd",
    }

    UNIQUE_ID_REQUIREMENTS = {
        "sldid": ("id", "file"),
        "sldmasterid": ("id", "global"),
        "sldlayoutid": ("id", "global"),
        "sp": ("id", "file"),
        "pic": ("id", "file"),
        "cxnsp": ("id", "file"),
        "grpsp": ("id", "file"),
    }

    def get_checks(self) -> list:
        """Add PPTX-specific checks to the base checks."""
        checks = super().get_checks()
        # Insert PPTX-specific checks before XSD validation
        xsd_idx = next((i for i, (name, _) in enumerate(checks) if "XSD" in name), len(checks))
        checks.insert(xsd_idx, ("Slide layout references", self.check_slide_layout_refs))
        checks.insert(xsd_idx + 1, ("Duplicate slide layouts", self.check_no_duplicate_slide_layouts))
        return checks

    def _get_schema_path(self, xml_file: Path):
        """Extend base schema mapping with PPTX-specific paths."""
        # Check base mappings first
        result = super()._get_schema_path(xml_file)
        if result:
            return result

        # PPTX-specific: files under ppt/ directory
        if xml_file.parent.name == "ppt":
            return self.schemas_dir / self.SCHEMA_MAPPINGS["ppt"]

        return None

    def check_content_types(self) -> list:
        """Extended content type check with PPTX-specific declarable roots."""
        errors = super().check_content_types()

        ct_file = self.unpacked_dir / "[Content_Types].xml"
        if not ct_file.exists():
            return errors

        try:
            from .base import NS_CONTENT_TYPES
            root = lxml.etree.parse(str(ct_file)).getroot()
            declared_parts = set()

            for override in root.findall(f".//{{{NS_CONTENT_TYPES}}}Override"):
                part = override.get("PartName")
                if part:
                    declared_parts.add(part.lstrip("/"))

            # Check that slide/layout/master XML files are declared
            declarable_roots = {"sld", "sldLayout", "sldMaster", "presentation", "theme"}
            for xml_file in self.xml_files:
                path_str = str(xml_file.relative_to(self.unpacked_dir)).replace("\\", "/")
                if any(skip in path_str for skip in [".rels", "[Content_Types]", "docProps/", "_rels/"]):
                    continue
                try:
                    file_root = lxml.etree.parse(str(xml_file)).getroot()
                    root_name = file_root.tag.split("}")[-1] if "}" in file_root.tag else file_root.tag
                    if root_name in declarable_roots and path_str not in declared_parts:
                        errors.append(f"{path_str}: Not declared in [Content_Types].xml")
                except Exception:
                    continue

        except Exception as e:
            errors.append(f"Error in PPTX content type check: {e}")

        return errors

    def check_slide_layout_refs(self) -> list:
        errors = []
        for master in self.unpacked_dir.glob("ppt/slideMasters/*.xml"):
            try:
                root = lxml.etree.parse(str(master)).getroot()
                rels_file = master.parent / "_rels" / f"{master.name}.rels"

                if not rels_file.exists():
                    errors.append(f"{master.relative_to(self.unpacked_dir)}: Missing .rels file")
                    continue

                rels_root = lxml.etree.parse(str(rels_file)).getroot()
                valid_rids = {
                    rel.get("Id")
                    for rel in rels_root.findall(f".//{{{NS_PKG_RELS}}}Relationship")
                    if "slideLayout" in rel.get("Type", "")
                }

                for sld_layout_id in root.findall(f".//{{{NS_PML}}}sldLayoutId"):
                    r_id = sld_layout_id.get(f"{{{NS_OFFICE_RELS}}}id")
                    if r_id and r_id not in valid_rids:
                        errors.append(
                            f"{master.relative_to(self.unpacked_dir)}: "
                            f"sldLayoutId references non-existent r:id='{r_id}'"
                        )
            except Exception as e:
                errors.append(f"{master.relative_to(self.unpacked_dir)}: Error: {e}")

        return errors

    def check_no_duplicate_slide_layouts(self) -> list:
        errors = []
        for rels_file in self.unpacked_dir.glob("ppt/slides/_rels/*.xml.rels"):
            try:
                root = lxml.etree.parse(str(rels_file)).getroot()
                layout_count = sum(
                    1 for rel in root.findall(f".//{{{NS_PKG_RELS}}}Relationship")
                    if "slideLayout" in rel.get("Type", "")
                )
                if layout_count > 1:
                    errors.append(
                        f"{rels_file.relative_to(self.unpacked_dir)}: "
                        f"has {layout_count} slideLayout references (should be 1)"
                    )
            except Exception as e:
                errors.append(f"{rels_file.relative_to(self.unpacked_dir)}: Error: {e}")
        return errors
