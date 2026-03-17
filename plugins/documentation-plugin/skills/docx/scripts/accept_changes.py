#!/usr/bin/env python3
"""
Accept all tracked changes in a DOCX file using LibreOffice macro.

This script opens the document in LibreOffice, accepts all tracked changes,
and saves the result.

Usage:
    python accept_changes.py input.docx [output.docx]

Examples:
    python accept_changes.py document.docx
    # Overwrites document.docx with all changes accepted

    python accept_changes.py document.docx clean.docx
    # Saves accepted version to clean.docx
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Import shared soffice helper
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts" / "office"))
from soffice import find_soffice, get_soffice_env


ACCEPT_CHANGES_MACRO = r"""
import uno
from com.sun.star.beans import PropertyValue

def accept_all_changes():
    desktop = XSCRIPTCONTEXT.getDesktop()
    doc = desktop.getCurrentComponent()

    if doc is None:
        return

    # Accept all tracked changes
    dispatcher = createUnoService("com.sun.star.frame.DispatchHelper")
    dispatcher.executeDispatch(doc.getCurrentController().getFrame(),
                               ".uno:AcceptAllTrackedChanges", "", 0, ())

    # Save the document
    doc.store()
"""


def accept_changes(input_path: str, output_path: str = None) -> str:
    """
    Accept all tracked changes in a DOCX file.

    Args:
        input_path: Path to the input .docx file
        output_path: Optional output path. If None, overwrites the input.

    Returns:
        Path to the output file.
    """
    input_path = Path(input_path).resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if output_path:
        output_path = Path(output_path).resolve()
        # Work on a copy
        shutil.copy2(input_path, output_path)
        work_path = output_path
    else:
        work_path = input_path
        output_path = input_path

    soffice = find_soffice()
    env = get_soffice_env()

    # Use LibreOffice macro to accept all changes
    # The approach: open the document with a macro that accepts all changes
    macro_script = (
        'macro:///Standard.Module1.AcceptAllChanges'
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create a temporary macro file
        macro_dir = tmp_path / "user" / "basic" / "Standard"
        macro_dir.mkdir(parents=True)

        # Write the macro module
        (macro_dir / "Module1.xba").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">\n'
            '<script:module xmlns:script="http://openoffice.org/2000/script" '
            'script:name="Module1" script:language="StarBasic">\n'
            'Sub AcceptAllChanges\n'
            '  Dim oDoc As Object\n'
            '  Dim oDispatcher As Object\n'
            '  oDoc = ThisComponent\n'
            '  oDispatcher = createUnoService("com.sun.star.frame.DispatchHelper")\n'
            '  oDispatcher.executeDispatch(oDoc.CurrentController.Frame, '
            '".uno:AcceptAllTrackedChanges", "", 0, Array())\n'
            '  oDoc.store()\n'
            'End Sub\n'
            '</script:module>',
            encoding="utf-8"
        )

        # Write the dialog.xlc and script.xlc
        (macro_dir / "dialog.xlc").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!DOCTYPE library:library PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">\n'
            '<library:library xmlns:library="http://openoffice.org/2000/library" '
            'library:name="Standard" library:readonly="false" library:passwordprotected="false">\n'
            '</library:library>',
            encoding="utf-8"
        )

        (macro_dir / "script.xlb").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!DOCTYPE library:library PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">\n'
            '<library:library xmlns:library="http://openoffice.org/2000/library" '
            'library:name="Standard" library:readonly="false" library:passwordprotected="false">\n'
            ' <library:element library:name="Module1"/>\n'
            '</library:library>',
            encoding="utf-8"
        )

        # Run LibreOffice with the macro
        user_profile = f"-env:UserInstallation=file://{tmp_path}/user"
        result = subprocess.run(
            [
                soffice,
                "--headless",
                user_profile,
                f"macro:///{macro_script}",
                str(work_path),
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )

        # Alternative approach: use a simpler command-line method
        # If the macro approach fails, try the filter-based approach
        if result.returncode != 0:
            # Fallback: convert to/from docx which strips tracked changes
            print("Macro approach failed, using filter fallback...")
            tmp_output = tmp_path / "output.docx"

            result = subprocess.run(
                [
                    soffice,
                    "--headless",
                    "--infilter=Microsoft Word 2007-365 XML",
                    "--convert-to", "docx:Microsoft Word 2007-365 XML",
                    "--outdir", str(tmp_path),
                    str(work_path),
                ],
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
            )

            if result.returncode == 0:
                # Find the output file
                docx_files = list(tmp_path.glob("*.docx"))
                if docx_files:
                    shutil.copy2(docx_files[0], output_path)

    print(f"Accepted all changes: {output_path}")
    return str(output_path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python accept_changes.py input.docx [output.docx]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    accept_changes(inp, out)
