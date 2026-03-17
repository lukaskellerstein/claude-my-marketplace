#!/usr/bin/env python3
"""
DOCX-specific validator.

Extends BaseSchemaValidator with WordprocessingML-specific checks:
whitespace preservation, deletion/insertion validation, paraId/durableId
range constraints, comment marker pairing, and auto-repair for out-of-range IDs.
"""

import random
import re
from pathlib import Path

import lxml.etree

from .base import BaseSchemaValidator, NS_CONTENT_TYPES

NS_WML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS_W14 = "http://schemas.microsoft.com/office/word/2010/wordml"
NS_W15 = "http://schemas.microsoft.com/office/word/2012/wordml"


class DOCXSchemaValidator(BaseSchemaValidator):
    """Validates an unpacked DOCX directory."""

    SCHEMA_MAPPINGS = {
        **BaseSchemaValidator.SCHEMA_MAPPINGS,
        "word": "ISO-IEC29500-4_2016/wml.xsd",
    }

    UNIQUE_ID_REQUIREMENTS = {
        "sp": ("id", "file"),
        "pic": ("id", "file"),
    }

    # Maximum valid values for paraId and durableId attributes
    PARA_ID_MAX = 0x7FFFFFFF
    DURABLE_ID_MAX = 0x7FFFFFFF

    def get_checks(self) -> list:
        """Add DOCX-specific checks to the base checks."""
        checks = super().get_checks()
        xsd_idx = next((i for i, (name, _) in enumerate(checks) if "XSD" in name), len(checks))
        checks.insert(xsd_idx, ("Whitespace preservation", self.check_whitespace_preserve))
        checks.insert(xsd_idx + 1, ("Deletion validation", self.check_deletions))
        checks.insert(xsd_idx + 2, ("Insertion validation", self.check_insertions))
        checks.insert(xsd_idx + 3, ("paraId/durableId ranges", self.check_para_id_ranges))
        checks.insert(xsd_idx + 4, ("Comment marker pairing", self.check_comment_markers))
        return checks

    def _get_schema_path(self, xml_file: Path):
        """Extend base schema mapping with DOCX-specific paths."""
        result = super()._get_schema_path(xml_file)
        if result:
            return result

        # DOCX-specific: files under word/ directory
        if xml_file.parent.name == "word":
            return self.schemas_dir / self.SCHEMA_MAPPINGS["word"]

        return None

    def check_content_types(self) -> list:
        """Extended content type check with DOCX-specific declarable roots."""
        errors = super().check_content_types()

        ct_file = self.unpacked_dir / "[Content_Types].xml"
        if not ct_file.exists():
            return errors

        try:
            root = lxml.etree.parse(str(ct_file)).getroot()
            declared_parts = set()

            for override in root.findall(f".//{{{NS_CONTENT_TYPES}}}Override"):
                part = override.get("PartName")
                if part:
                    declared_parts.add(part.lstrip("/"))

            # Check that document/styles/settings files are declared
            declarable_roots = {"document", "styles", "settings", "numbering", "fontTable", "footnotes", "endnotes"}
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
            errors.append(f"Error in DOCX content type check: {e}")

        return errors

    def check_whitespace_preserve(self) -> list:
        """Check that w:t elements with leading/trailing whitespace have xml:space='preserve'."""
        errors = []
        for f in self.xml_files:
            if f.suffix == ".rels":
                continue
            try:
                root = lxml.etree.parse(str(f)).getroot()
                for t_elem in root.iter(f"{{{NS_WML}}}t"):
                    text = t_elem.text
                    if text and (text.startswith((" ", "\t")) or text.endswith((" ", "\t"))):
                        space_attr = t_elem.get("{http://www.w3.org/XML/1998/namespace}space")
                        if space_attr != "preserve":
                            errors.append(
                                f"{f.relative_to(self.unpacked_dir)}: Line {t_elem.sourceline}: "
                                f"<w:t> with whitespace missing xml:space='preserve'"
                            )
            except lxml.etree.XMLSyntaxError:
                continue
        return errors

    def check_deletions(self) -> list:
        """Check that w:del elements use w:delText, not w:t."""
        errors = []
        for f in self.xml_files:
            if f.suffix == ".rels":
                continue
            try:
                root = lxml.etree.parse(str(f)).getroot()
                for del_elem in root.iter(f"{{{NS_WML}}}del"):
                    for t_elem in del_elem.iter(f"{{{NS_WML}}}t"):
                        errors.append(
                            f"{f.relative_to(self.unpacked_dir)}: Line {t_elem.sourceline}: "
                            f"<w:t> found inside <w:del> (should use <w:delText>)"
                        )
            except lxml.etree.XMLSyntaxError:
                continue
        return errors

    def check_insertions(self) -> list:
        """Check that w:ins elements use w:t, not w:delText."""
        errors = []
        for f in self.xml_files:
            if f.suffix == ".rels":
                continue
            try:
                root = lxml.etree.parse(str(f)).getroot()
                for ins_elem in root.iter(f"{{{NS_WML}}}ins"):
                    for dt_elem in ins_elem.iter(f"{{{NS_WML}}}delText"):
                        errors.append(
                            f"{f.relative_to(self.unpacked_dir)}: Line {dt_elem.sourceline}: "
                            f"<w:delText> found inside <w:ins> (should use <w:t>)"
                        )
            except lxml.etree.XMLSyntaxError:
                continue
        return errors

    def check_para_id_ranges(self) -> list:
        """Check that w14:paraId and w14:durableId values are within valid range."""
        errors = []
        for f in self.xml_files:
            if f.suffix == ".rels":
                continue
            try:
                root = lxml.etree.parse(str(f)).getroot()
                for elem in root.iter():
                    for attr_name, max_val in [
                        (f"{{{NS_W14}}}paraId", self.PARA_ID_MAX),
                        (f"{{{NS_W14}}}durableId", self.DURABLE_ID_MAX),
                    ]:
                        val = elem.get(attr_name)
                        if val:
                            try:
                                int_val = int(val, 16)
                                if int_val > max_val:
                                    tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                                    errors.append(
                                        f"{f.relative_to(self.unpacked_dir)}: Line {elem.sourceline}: "
                                        f"<{tag}> {attr_name.split('}')[-1]}='{val}' "
                                        f"exceeds maximum 0x{max_val:08X}"
                                    )
                            except ValueError:
                                pass
            except lxml.etree.XMLSyntaxError:
                continue
        return errors

    def check_comment_markers(self) -> list:
        """Check that every commentRangeStart has a matching commentRangeEnd and vice versa."""
        errors = []
        for f in self.xml_files:
            if f.suffix == ".rels":
                continue
            try:
                root = lxml.etree.parse(str(f)).getroot()

                starts = set()
                ends = set()

                for elem in root.iter(f"{{{NS_WML}}}commentRangeStart"):
                    cid = elem.get(f"{{{NS_WML}}}id")
                    if cid:
                        starts.add(cid)

                for elem in root.iter(f"{{{NS_WML}}}commentRangeEnd"):
                    cid = elem.get(f"{{{NS_WML}}}id")
                    if cid:
                        ends.add(cid)

                for cid in starts - ends:
                    errors.append(
                        f"{f.relative_to(self.unpacked_dir)}: "
                        f"commentRangeStart id='{cid}' has no matching commentRangeEnd"
                    )
                for cid in ends - starts:
                    errors.append(
                        f"{f.relative_to(self.unpacked_dir)}: "
                        f"commentRangeEnd id='{cid}' has no matching commentRangeStart"
                    )

            except lxml.etree.XMLSyntaxError:
                continue
        return errors

    def repair(self) -> int:
        """Auto-repair common DOCX issues. Extends base repair."""
        repairs = super().repair()

        # Fix out-of-range paraId/durableId values
        for xml_file in self.xml_files:
            if xml_file.suffix == ".rels":
                continue
            try:
                content = xml_file.read_text(encoding="utf-8")
                root = lxml.etree.fromstring(content.encode("utf-8"))
                modified = False

                for elem in root.iter():
                    for ns_attr, max_val in [
                        (f"{{{NS_W14}}}paraId", self.PARA_ID_MAX),
                        (f"{{{NS_W14}}}durableId", self.DURABLE_ID_MAX),
                    ]:
                        val = elem.get(ns_attr)
                        if val:
                            try:
                                int_val = int(val, 16)
                                if int_val > max_val:
                                    new_val = f"{random.randint(0, max_val):08X}"
                                    elem.set(ns_attr, new_val)
                                    modified = True
                                    repairs += 1
                                    if self.verbose:
                                        print(f"  Repaired: {xml_file.name}: {ns_attr.split('}')[-1]} {val} -> {new_val}")
                            except ValueError:
                                pass

                if modified:
                    xml_file.write_bytes(lxml.etree.tostring(root, xml_declaration=True, encoding="UTF-8"))

            except Exception:
                pass

        if repairs:
            print(f"Auto-repaired {repairs} issue(s)")
        return repairs
