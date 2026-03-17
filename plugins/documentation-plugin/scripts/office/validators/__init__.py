# OOXML validators

from .base import BaseSchemaValidator
from .pptx import PPTXSchemaValidator
from .docx import DOCXSchemaValidator
from .xlsx import XLSXSchemaValidator


def get_validator(ext_or_path: str):
    """Return the appropriate validator class for the given file extension or path."""
    ext = ext_or_path.lower()
    if not ext.startswith("."):
        # Could be a path — extract extension
        from pathlib import Path
        ext = Path(ext).suffix.lower()

    if ext == ".pptx":
        return PPTXSchemaValidator
    elif ext == ".docx":
        return DOCXSchemaValidator
    elif ext in (".xlsx", ".xlsm"):
        return XLSXSchemaValidator
    return None
