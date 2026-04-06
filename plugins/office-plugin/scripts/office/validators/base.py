#!/usr/bin/env python3
"""
Base OOXML schema validator with shared validation logic.

Provides XML well-formedness checks, namespace validation, unique ID checks,
file reference validation, content type checks, relationship ID checks,
and XSD schema validation — all shared across DOCX, PPTX, and XLSX formats.
"""

import tempfile
import zipfile
from pathlib import Path

try:
    import lxml.etree
    import defusedxml.minidom
except ImportError:
    raise ImportError(
        "lxml and defusedxml are required.\n"
        "Install with: pip install lxml defusedxml --break-system-packages"
    )


# OOXML namespace constants
NS_PKG_RELS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS_OFFICE_RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_CONTENT_TYPES = "http://schemas.openxmlformats.org/package/2006/content-types"
NS_MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"

# Standard OOXML namespaces (non-extension)
OOXML_NAMESPACES = {
    "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "http://schemas.openxmlformats.org/drawingml/2006/main",
    "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "http://schemas.openxmlformats.org/drawingml/2006/chartDrawing",
    "http://schemas.openxmlformats.org/drawingml/2006/diagram",
    "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "http://schemas.openxmlformats.org/presentationml/2006/main",
    "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "http://schemas.openxmlformats.org/officeDocument/2006/sharedTypes",
    "http://www.w3.org/XML/1998/namespace",
}


class BaseSchemaValidator:
    """Base class for OOXML document validation."""

    # Subclasses should override these
    SCHEMA_MAPPINGS = {
        "[Content_Types].xml": "ecma/fouth-edition/opc-contentTypes.xsd",
        "app.xml": "ISO-IEC29500-4_2016/shared-documentPropertiesExtended.xsd",
        "core.xml": "ecma/fouth-edition/opc-coreProperties.xsd",
        ".rels": "ecma/fouth-edition/opc-relationships.xsd",
        "chart": "ISO-IEC29500-4_2016/dml-chart.xsd",
        "theme": "ISO-IEC29500-4_2016/dml-main.xsd",
        "drawing": "ISO-IEC29500-4_2016/dml-main.xsd",
    }

    UNIQUE_ID_REQUIREMENTS = {}

    def __init__(self, unpacked_dir, original_file=None, verbose=False):
        self.unpacked_dir = Path(unpacked_dir).resolve()
        self.original_file = Path(original_file) if original_file else None
        self.verbose = verbose
        self.schemas_dir = Path(__file__).parent.parent / "schemas"
        self.xml_files = (
            list(self.unpacked_dir.rglob("*.xml"))
            + list(self.unpacked_dir.rglob("*.rels"))
        )
        self.errors = []

    def get_checks(self) -> list:
        """Return list of (name, check_fn) tuples. Subclasses can extend."""
        return [
            ("XML well-formedness", self.check_xml_wellformed),
            ("Namespace declarations", self.check_namespaces),
            ("Unique IDs", self.check_unique_ids),
            ("File references", self.check_file_references),
            ("Content types", self.check_content_types),
            ("Relationship IDs", self.check_relationship_ids),
            ("XSD schema validation", self.check_xsd),
        ]

    def validate(self) -> bool:
        """Run all validations. Returns True if all pass."""
        checks = self.get_checks()
        all_passed = True

        for name, check_fn in checks:
            errors = check_fn()
            if errors:
                all_passed = False
                print(f"FAILED - {name}: {len(errors)} error(s)")
                for err in errors[:10]:
                    print(f"  {err}")
                if len(errors) > 10:
                    print(f"  ... and {len(errors) - 10} more")
            elif self.verbose:
                print(f"PASSED - {name}")

        if all_passed:
            print("All validations PASSED!")
        return all_passed

    def repair(self) -> int:
        """Auto-repair common issues. Returns count of repairs made."""
        repairs = 0
        for xml_file in self.xml_files:
            try:
                content = xml_file.read_text(encoding="utf-8")
                dom = defusedxml.minidom.parseString(content)
                modified = False

                # Fix missing xml:space="preserve" on text elements with whitespace
                for elem in dom.getElementsByTagName("*"):
                    if elem.tagName.endswith(":t") and elem.firstChild:
                        text = elem.firstChild.nodeValue
                        if text and (text.startswith((" ", "\t")) or text.endswith((" ", "\t"))):
                            if elem.getAttribute("xml:space") != "preserve":
                                elem.setAttribute("xml:space", "preserve")
                                repairs += 1
                                modified = True
                                if self.verbose:
                                    print(f"  Repaired: {xml_file.name}: Added xml:space='preserve'")

                if modified:
                    xml_file.write_bytes(dom.toxml(encoding="UTF-8"))
            except Exception:
                pass

        if repairs:
            print(f"Auto-repaired {repairs} issue(s)")
        return repairs

    # --- Individual checks ---

    def check_xml_wellformed(self) -> list:
        errors = []
        for f in self.xml_files:
            try:
                lxml.etree.parse(str(f))
            except lxml.etree.XMLSyntaxError as e:
                errors.append(f"{f.relative_to(self.unpacked_dir)}: Line {e.lineno}: {e.msg}")
        return errors

    def check_namespaces(self) -> list:
        errors = []
        for f in self.xml_files:
            try:
                root = lxml.etree.parse(str(f)).getroot()
                declared = set(root.nsmap.keys()) - {None}
                for attr_val in [v for k, v in root.attrib.items() if k.endswith("Ignorable")]:
                    undeclared = set(attr_val.split()) - declared
                    for ns in undeclared:
                        errors.append(
                            f"{f.relative_to(self.unpacked_dir)}: "
                            f"Namespace '{ns}' in Ignorable but not declared"
                        )
            except lxml.etree.XMLSyntaxError:
                continue
        return errors

    def check_unique_ids(self) -> list:
        errors = []
        global_ids = {}

        for f in self.xml_files:
            try:
                root = lxml.etree.parse(str(f)).getroot()
                file_ids = {}

                # Remove mc:AlternateContent before checking
                for elem in root.xpath(".//mc:AlternateContent", namespaces={"mc": NS_MC}):
                    elem.getparent().remove(elem)

                for elem in root.iter():
                    tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()

                    if tag in self.UNIQUE_ID_REQUIREMENTS:
                        attr_name, scope = self.UNIQUE_ID_REQUIREMENTS[tag]
                        id_value = None
                        for attr, value in elem.attrib.items():
                            attr_local = attr.split("}")[-1].lower() if "}" in attr else attr.lower()
                            if attr_local == attr_name:
                                id_value = value
                                break

                        if id_value is None:
                            continue

                        rel_path = f.relative_to(self.unpacked_dir)
                        if scope == "global":
                            if id_value in global_ids:
                                prev = global_ids[id_value]
                                errors.append(
                                    f"{rel_path}: Line {elem.sourceline}: "
                                    f"Global ID '{id_value}' in <{tag}> already used in {prev}"
                                )
                            else:
                                global_ids[id_value] = f"{rel_path}:{elem.sourceline}"
                        else:
                            key = (tag, attr_name)
                            if key not in file_ids:
                                file_ids[key] = {}
                            if id_value in file_ids[key]:
                                errors.append(
                                    f"{rel_path}: Line {elem.sourceline}: "
                                    f"Duplicate {attr_name}='{id_value}' in <{tag}>"
                                )
                            else:
                                file_ids[key][id_value] = elem.sourceline
            except Exception as e:
                errors.append(f"{f.relative_to(self.unpacked_dir)}: Error: {e}")

        return errors

    def check_file_references(self) -> list:
        errors = []
        all_files = {
            fp.resolve()
            for fp in self.unpacked_dir.rglob("*")
            if fp.is_file()
            and fp.name != "[Content_Types].xml"
            and not fp.name.endswith(".rels")
        }
        all_referenced = set()

        for rels_file in self.unpacked_dir.rglob("*.rels"):
            try:
                root = lxml.etree.parse(str(rels_file)).getroot()
                rels_dir = rels_file.parent

                for rel in root.findall(f".//{{{NS_PKG_RELS}}}Relationship"):
                    target = rel.get("Target")
                    if not target or target.startswith(("http", "mailto:")):
                        continue

                    if target.startswith("/"):
                        target_path = self.unpacked_dir / target.lstrip("/")
                    elif rels_file.name == ".rels":
                        target_path = self.unpacked_dir / target
                    else:
                        target_path = rels_dir.parent / target

                    try:
                        target_path = target_path.resolve()
                        if target_path.exists() and target_path.is_file():
                            all_referenced.add(target_path)
                        else:
                            errors.append(
                                f"{rels_file.relative_to(self.unpacked_dir)}: "
                                f"Broken reference to {target}"
                            )
                    except (OSError, ValueError):
                        errors.append(
                            f"{rels_file.relative_to(self.unpacked_dir)}: "
                            f"Invalid path: {target}"
                        )
            except Exception as e:
                errors.append(f"{rels_file.relative_to(self.unpacked_dir)}: Error: {e}")

        for unref in sorted(all_files - all_referenced):
            errors.append(f"Unreferenced file: {unref.relative_to(self.unpacked_dir)}")

        return errors

    def check_content_types(self) -> list:
        errors = []
        ct_file = self.unpacked_dir / "[Content_Types].xml"
        if not ct_file.exists():
            return ["[Content_Types].xml not found"]

        try:
            root = lxml.etree.parse(str(ct_file)).getroot()
            declared_parts = set()
            declared_exts = set()

            for override in root.findall(f".//{{{NS_CONTENT_TYPES}}}Override"):
                part = override.get("PartName")
                if part:
                    declared_parts.add(part.lstrip("/"))

            for default in root.findall(f".//{{{NS_CONTENT_TYPES}}}Default"):
                ext = default.get("Extension")
                if ext:
                    declared_exts.add(ext.lower())

            # Check media files have declared extensions
            media_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif"}
            for fp in self.unpacked_dir.rglob("*"):
                if not fp.is_file() or fp.suffix.lower() in {".xml", ".rels"} or "_rels" in fp.parts:
                    continue
                ext = fp.suffix.lstrip(".").lower()
                if ext and ext not in declared_exts and ext in media_types:
                    errors.append(
                        f'{fp.relative_to(self.unpacked_dir)}: Extension "{ext}" not in [Content_Types].xml'
                    )

        except Exception as e:
            errors.append(f"Error parsing [Content_Types].xml: {e}")

        return errors

    def check_relationship_ids(self) -> list:
        errors = []

        for xml_file in self.xml_files:
            if xml_file.suffix == ".rels":
                continue

            rels_file = xml_file.parent / "_rels" / f"{xml_file.name}.rels"
            if not rels_file.exists():
                continue

            try:
                rels_root = lxml.etree.parse(str(rels_file)).getroot()
                valid_rids = set()
                seen_rids = set()

                for rel in rels_root.findall(f".//{{{NS_PKG_RELS}}}Relationship"):
                    rid = rel.get("Id")
                    if rid:
                        if rid in seen_rids:
                            errors.append(
                                f"{rels_file.relative_to(self.unpacked_dir)}: "
                                f"Duplicate relationship ID '{rid}'"
                            )
                        seen_rids.add(rid)
                        valid_rids.add(rid)

                xml_root = lxml.etree.parse(str(xml_file)).getroot()
                for elem in xml_root.iter():
                    for attr_name in ["id", "embed", "link"]:
                        rid_attr = elem.get(f"{{{NS_OFFICE_RELS}}}{attr_name}")
                        if rid_attr and rid_attr not in valid_rids:
                            elem_name = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                            errors.append(
                                f"{xml_file.relative_to(self.unpacked_dir)}: "
                                f"Line {elem.sourceline}: <{elem_name}> r:{attr_name} "
                                f"references non-existent '{rid_attr}'"
                            )
            except Exception as e:
                errors.append(f"{xml_file.relative_to(self.unpacked_dir)}: Error: {e}")

        return errors

    def check_xsd(self) -> list:
        """Validate XML files against XSD schemas."""
        if not self.schemas_dir.exists():
            return ["Schemas directory not found -- skipping XSD validation"]

        errors = []
        valid_count = 0
        skipped_count = 0

        for xml_file in self.xml_files:
            schema_path = self._get_schema_path(xml_file)
            if not schema_path:
                skipped_count += 1
                continue

            is_valid, new_errors = self._validate_file_xsd(xml_file, schema_path)
            if is_valid is None:
                skipped_count += 1
            elif is_valid:
                valid_count += 1
            else:
                rel_path = xml_file.relative_to(self.unpacked_dir)
                for err in list(new_errors)[:3]:
                    truncated = err[:200] + "..." if len(err) > 200 else err
                    errors.append(f"{rel_path}: {truncated}")

        if self.verbose:
            total = len(self.xml_files)
            print(f"  XSD: {valid_count} valid, {skipped_count} skipped, {total} total")

        return errors

    def _get_schema_path(self, xml_file: Path):
        """Find the XSD schema for a given XML file. Subclasses should extend."""
        if xml_file.name in self.SCHEMA_MAPPINGS:
            return self.schemas_dir / self.SCHEMA_MAPPINGS[xml_file.name]
        if xml_file.suffix == ".rels":
            return self.schemas_dir / self.SCHEMA_MAPPINGS[".rels"]
        if "charts/" in str(xml_file) and xml_file.name.startswith("chart"):
            return self.schemas_dir / self.SCHEMA_MAPPINGS["chart"]
        if "theme/" in str(xml_file) and xml_file.name.startswith("theme"):
            return self.schemas_dir / self.SCHEMA_MAPPINGS["theme"]
        return None

    def _validate_file_xsd(self, xml_file: Path, schema_path: Path):
        """Validate a single file against its XSD schema."""
        try:
            with open(schema_path, "rb") as xsd_f:
                xsd_doc = lxml.etree.parse(xsd_f, base_url=str(schema_path))
                schema = lxml.etree.XMLSchema(xsd_doc)

            xml_doc = lxml.etree.parse(str(xml_file))

            # Remove mc:Ignorable and extension namespaces before validation
            root = xml_doc.getroot()
            if f"{{{NS_MC}}}Ignorable" in root.attrib:
                del root.attrib[f"{{{NS_MC}}}Ignorable"]

            xml_string = lxml.etree.tostring(xml_doc, encoding="unicode")
            xml_copy = lxml.etree.fromstring(xml_string)
            self._clean_extensions(xml_copy)
            cleaned_doc = lxml.etree.ElementTree(xml_copy)

            if schema.validate(cleaned_doc):
                return True, set()

            current_errors = {err.message for err in schema.error_log}

            if self.original_file:
                original_errors = self._get_original_errors(xml_file, schema_path)
                new_errors = current_errors - original_errors
            else:
                new_errors = current_errors

            if new_errors:
                return False, new_errors
            return True, set()

        except Exception as e:
            return None, {str(e)}

    def _clean_extensions(self, root):
        """Remove non-OOXML namespace elements and attributes."""
        to_remove = []
        for elem in list(root):
            if not hasattr(elem, "tag") or callable(elem.tag):
                continue
            tag_str = str(elem.tag)
            if tag_str.startswith("{"):
                ns = tag_str.split("}")[0][1:]
                if ns not in OOXML_NAMESPACES:
                    to_remove.append(elem)
                    continue
            self._clean_extensions(elem)

        for elem in to_remove:
            root.remove(elem)

        attrs_to_remove = []
        for attr in root.attrib:
            if "{" in attr:
                ns = attr.split("}")[0][1:]
                if ns not in OOXML_NAMESPACES:
                    attrs_to_remove.append(attr)
        for attr in attrs_to_remove:
            del root.attrib[attr]

    def _get_original_errors(self, xml_file: Path, schema_path: Path) -> set:
        """Get validation errors from the original file for comparison."""
        if not self.original_file:
            return set()

        rel_path = xml_file.relative_to(self.unpacked_dir)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            try:
                with zipfile.ZipFile(self.original_file, "r") as zf:
                    zf.extractall(tmp_path)
            except Exception:
                return set()

            orig_file = tmp_path / rel_path
            if not orig_file.exists():
                return set()

            _, errors = self._validate_file_xsd(orig_file, schema_path)
            return errors if errors else set()
