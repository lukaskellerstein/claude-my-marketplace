#!/usr/bin/env python3
"""
XLSX-specific validator.

Extends BaseSchemaValidator with SpreadsheetML-specific checks:
sheet ID uniqueness, defined name validity, SharedStrings integrity,
cell reference consistency, and content type validation.
"""

from pathlib import Path

import lxml.etree

from .base import BaseSchemaValidator, NS_CONTENT_TYPES

NS_SML = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


class XLSXSchemaValidator(BaseSchemaValidator):
    """Validates an unpacked XLSX directory."""

    SCHEMA_MAPPINGS = {
        **BaseSchemaValidator.SCHEMA_MAPPINGS,
        "xl": "ISO-IEC29500-4_2016/sml.xsd",
    }

    UNIQUE_ID_REQUIREMENTS = {
        "sheet": ("sheetid", "global"),
    }

    def get_checks(self) -> list:
        """Add XLSX-specific checks to the base checks."""
        checks = super().get_checks()
        xsd_idx = next((i for i, (name, _) in enumerate(checks) if "XSD" in name), len(checks))
        checks.insert(xsd_idx, ("Sheet ID uniqueness", self.check_sheet_ids))
        checks.insert(xsd_idx + 1, ("Defined name validity", self.check_defined_names))
        checks.insert(xsd_idx + 2, ("SharedStrings integrity", self.check_shared_strings))
        return checks

    def _get_schema_path(self, xml_file: Path):
        """Extend base schema mapping with XLSX-specific paths."""
        result = super()._get_schema_path(xml_file)
        if result:
            return result

        # XLSX-specific: files under xl/ directory
        if xml_file.parent.name == "xl":
            return self.schemas_dir / self.SCHEMA_MAPPINGS["xl"]

        return None

    def check_content_types(self) -> list:
        """Extended content type check with XLSX-specific declarable roots."""
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

            # Check that worksheet/workbook/styles files are declared
            declarable_roots = {"worksheet", "workbook", "styleSheet", "sst", "calcChain"}
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
            errors.append(f"Error in XLSX content type check: {e}")

        return errors

    def check_sheet_ids(self) -> list:
        """Check that each sheet has a unique sheetId and unique name in workbook.xml."""
        errors = []
        workbook_xml = self.unpacked_dir / "xl" / "workbook.xml"
        if not workbook_xml.exists():
            return ["xl/workbook.xml not found"]

        try:
            root = lxml.etree.parse(str(workbook_xml)).getroot()

            seen_ids = {}
            seen_names = {}

            for sheet in root.iter(f"{{{NS_SML}}}sheet"):
                sheet_id = sheet.get("sheetId")
                name = sheet.get("name")

                if sheet_id:
                    if sheet_id in seen_ids:
                        errors.append(
                            f"xl/workbook.xml: Duplicate sheetId='{sheet_id}' "
                            f"(sheets: '{seen_ids[sheet_id]}' and '{name}')"
                        )
                    else:
                        seen_ids[sheet_id] = name

                if name:
                    if name in seen_names:
                        errors.append(
                            f"xl/workbook.xml: Duplicate sheet name='{name}'"
                        )
                    else:
                        seen_names[name] = sheet_id

        except Exception as e:
            errors.append(f"xl/workbook.xml: Error: {e}")

        return errors

    def check_defined_names(self) -> list:
        """Check that defined names don't reference non-existent sheets."""
        errors = []
        workbook_xml = self.unpacked_dir / "xl" / "workbook.xml"
        if not workbook_xml.exists():
            return []

        try:
            root = lxml.etree.parse(str(workbook_xml)).getroot()

            # Collect sheet names
            sheet_names = set()
            for sheet in root.iter(f"{{{NS_SML}}}sheet"):
                name = sheet.get("name")
                if name:
                    sheet_names.add(name)

            # Check defined names for sheet references
            for defined_name in root.iter(f"{{{NS_SML}}}definedName"):
                formula = defined_name.text
                if not formula:
                    continue

                # Extract sheet references from formulas like "Sheet1!A1:B10"
                parts = formula.split("!")
                if len(parts) >= 2:
                    ref_sheet = parts[0].strip("'").strip()
                    if ref_sheet and ref_sheet not in sheet_names and not ref_sheet.startswith("#"):
                        name_attr = defined_name.get("name", "?")
                        errors.append(
                            f"xl/workbook.xml: Defined name '{name_attr}' references "
                            f"non-existent sheet '{ref_sheet}'"
                        )

        except Exception as e:
            errors.append(f"xl/workbook.xml: Error checking defined names: {e}")

        return errors

    def check_shared_strings(self) -> list:
        """Check SharedStrings count attribute matches actual entries."""
        errors = []
        sst_file = self.unpacked_dir / "xl" / "sharedStrings.xml"
        if not sst_file.exists():
            return []  # SharedStrings is optional

        try:
            root = lxml.etree.parse(str(sst_file)).getroot()

            # Get declared count and uniqueCount
            declared_count = root.get("count")
            declared_unique = root.get("uniqueCount")

            # Count actual <si> entries
            actual_entries = len(root.findall(f"{{{NS_SML}}}si"))

            if declared_unique is not None:
                try:
                    unique_int = int(declared_unique)
                    if unique_int != actual_entries:
                        errors.append(
                            f"xl/sharedStrings.xml: uniqueCount={declared_unique} "
                            f"but found {actual_entries} <si> entries"
                        )
                except ValueError:
                    errors.append(
                        f"xl/sharedStrings.xml: Invalid uniqueCount='{declared_unique}'"
                    )

        except Exception as e:
            errors.append(f"xl/sharedStrings.xml: Error: {e}")

        return errors
