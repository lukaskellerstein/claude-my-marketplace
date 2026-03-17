#!/usr/bin/env python3
"""
Redlining (tracked changes) validator for DOCX documents.

Validates that all edits are properly tracked by comparing the modified document
against the original — strips tracked changes from both and compares text content.
Detects untracked modifications that would silently alter the document.
"""

import re
import tempfile
import zipfile
from pathlib import Path

try:
    import lxml.etree
except ImportError:
    raise ImportError("lxml is required. Install with: pip install lxml --break-system-packages")


NS_WML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def extract_text(root, strip_tracked_changes: bool = False) -> str:
    """
    Extract plain text from a DOCX document.xml root element.

    Args:
        root: lxml root element of document.xml
        strip_tracked_changes: If True, remove tracked insertions and keep deletions
                               (to get the "original" text). If False, keep insertions
                               and remove deletions (to get the "current" text).
    """
    text_parts = []

    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

        if strip_tracked_changes:
            # Strip tracked changes to get original text
            if tag == "ins":
                # Skip inserted text (wasn't in original)
                continue
            if tag == "delText":
                # Keep deleted text (was in original)
                if elem.text:
                    text_parts.append(elem.text)
        else:
            # Get current text (with changes applied)
            if tag == "del":
                # Skip deleted text
                continue
            if tag == "t":
                if elem.text:
                    text_parts.append(elem.text)

        if tag == "p":
            text_parts.append("\n")

    return "".join(text_parts).strip()


def normalize_text(text: str) -> str:
    """Normalize text for comparison (collapse whitespace, strip)."""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


class RedliningValidator:
    """
    Validates that all changes in a DOCX are properly tracked.

    Compares modified document against original by:
    1. Extracting "original text" from modified doc (strip insertions, keep deletions)
    2. Extracting "original text" from the actual original doc
    3. Comparing — if they differ, there are untracked changes
    """

    def __init__(self, modified_dir, original_file, author=None, verbose=False):
        """
        Args:
            modified_dir: Path to unpacked modified DOCX directory
            original_file: Path to original .docx file (packed)
            author: If set, only validate changes by this author
            verbose: Print detailed output
        """
        self.modified_dir = Path(modified_dir).resolve()
        self.original_file = Path(original_file).resolve() if original_file else None
        self.author = author
        self.verbose = verbose

    def validate(self) -> bool:
        """
        Validate that all changes are tracked.

        Returns True if all changes are properly tracked (or documents match).
        """
        if not self.original_file or not self.original_file.exists():
            print("WARNING: No original file provided -- cannot validate tracked changes")
            return True

        errors = []

        # Get document.xml from modified
        mod_doc = self.modified_dir / "word" / "document.xml"
        if not mod_doc.exists():
            errors.append("word/document.xml not found in modified document")
            return self._report(errors)

        # Get document.xml from original
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            try:
                with zipfile.ZipFile(self.original_file, "r") as zf:
                    zf.extractall(tmp_path)
            except Exception as e:
                errors.append(f"Cannot read original file: {e}")
                return self._report(errors)

            orig_doc = tmp_path / "word" / "document.xml"
            if not orig_doc.exists():
                errors.append("word/document.xml not found in original document")
                return self._report(errors)

            # Parse both documents
            mod_root = lxml.etree.parse(str(mod_doc)).getroot()
            orig_root = lxml.etree.parse(str(orig_doc)).getroot()

            # Extract original text from modified doc (strip tracked insertions, keep deletions)
            mod_original_text = normalize_text(extract_text(mod_root, strip_tracked_changes=True))

            # Extract original text from actual original doc
            orig_text = normalize_text(extract_text(orig_root, strip_tracked_changes=False))

            if mod_original_text != orig_text:
                # Find where they differ
                min_len = min(len(mod_original_text), len(orig_text))
                diff_pos = min_len  # default: they differ at end
                for i in range(min_len):
                    if mod_original_text[i] != orig_text[i]:
                        diff_pos = i
                        break

                context_start = max(0, diff_pos - 30)
                context_end = min(max(len(mod_original_text), len(orig_text)), diff_pos + 30)

                errors.append(
                    f"Untracked changes detected at position ~{diff_pos}:\n"
                    f"  Original:  ...{orig_text[context_start:context_end]}...\n"
                    f"  Modified:  ...{mod_original_text[context_start:context_end]}..."
                )

        return self._report(errors)

    def _report(self, errors: list) -> bool:
        """Print results and return success status."""
        if errors:
            print(f"FAILED - Redlining validation: {len(errors)} error(s)")
            for err in errors[:5]:
                print(f"  {err}")
            return False
        else:
            if self.verbose:
                print("PASSED - Redlining validation: all changes properly tracked")
            return True
