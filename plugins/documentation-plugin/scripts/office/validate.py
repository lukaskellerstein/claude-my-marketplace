#!/usr/bin/env python3
"""
Validate Office documents (DOCX, PPTX, XLSX) against OOXML XSD schemas and structural rules.

Dispatches to DOCXSchemaValidator, PPTXSchemaValidator, or XLSXSchemaValidator based on file type.
Catches XML corruption, broken references, duplicate IDs, and schema violations.

Usage:
    python validate.py input.pptx [--original original.pptx] [--auto-repair] [-v]
    python validate.py input.docx [--original original.docx] [--auto-repair] [--author "Name"] [-v]
    python validate.py input.xlsx [--original original.xlsx] [-v]
    python validate.py unpacked_dir/ [--original original.docx] [-v]

Examples:
    python validate.py output.pptx -v
    python validate.py output.docx --original template.docx --auto-repair
    python validate.py output.xlsx -v
    python validate.py unpacked_dir/ --original template.docx -v

Dependencies:
    pip install lxml defusedxml --break-system-packages
"""

import argparse
import sys
import tempfile
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from validators import get_validator
from validators.redlining import RedliningValidator


def detect_format_from_dir(unpacked_dir: Path) -> str:
    """Detect Office format from unpacked directory structure."""
    if (unpacked_dir / "ppt").is_dir():
        return ".pptx"
    if (unpacked_dir / "word").is_dir():
        return ".docx"
    if (unpacked_dir / "xl").is_dir():
        return ".xlsx"
    return ""


def main():
    parser = argparse.ArgumentParser(description="Validate Office files against OOXML schemas")
    parser.add_argument("path", help="Path to .docx/.pptx/.xlsx file or unpacked directory")
    parser.add_argument("--original", default=None,
                        help="Original file for comparison (filters pre-existing errors)")
    parser.add_argument("--auto-repair", action="store_true", help="Auto-repair common issues")
    parser.add_argument("--author", default=None,
                        help="Author name for redlining validation (DOCX only)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()
    path = Path(args.path)

    if not path.exists():
        print(f"Error: {path} does not exist", file=sys.stderr)
        sys.exit(1)

    # Determine format and unpack if needed
    if path.is_file():
        ext = path.suffix.lower()
        if ext not in (".pptx", ".docx", ".xlsx"):
            print(f"Error: Unsupported file type: {ext}", file=sys.stderr)
            sys.exit(1)

        tmpdir = tempfile.mkdtemp()
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(tmpdir)
        unpacked_dir = Path(tmpdir)
    elif path.is_dir():
        unpacked_dir = path
        ext = detect_format_from_dir(unpacked_dir)
        if not ext:
            print(f"Error: Cannot detect format from directory structure", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Error: {path} is not a file or directory", file=sys.stderr)
        sys.exit(1)

    # Get the appropriate validator
    validator_cls = get_validator(ext)
    if not validator_cls:
        print(f"Error: No validator available for {ext}", file=sys.stderr)
        sys.exit(1)

    original = Path(args.original) if args.original else None
    validator = validator_cls(unpacked_dir, original, verbose=args.verbose)

    if args.auto_repair:
        validator.repair()

    success = validator.validate()

    # DOCX-specific: run redlining validation if original is provided
    if ext == ".docx" and original:
        redlining = RedliningValidator(unpacked_dir, original, author=args.author, verbose=args.verbose)
        if not redlining.validate():
            success = False

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
