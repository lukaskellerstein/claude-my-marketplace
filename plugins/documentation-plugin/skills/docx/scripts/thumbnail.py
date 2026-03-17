#!/usr/bin/env python3
"""
Generate page thumbnails from a DOCX file.

Converts DOCX -> PDF via LibreOffice, then PDF -> individual page JPGs via pdftoppm,
and creates a grid overview image using Pillow.

Usage:
    python thumbnail.py input.docx [output_prefix] [--cols N]

Examples:
    python thumbnail.py document.docx
    # Creates: thumbnails.jpg

    python thumbnail.py document.docx pages --cols 3
    # Creates: pages.jpg (or pages-1.jpg, pages-2.jpg for long documents)
"""

import argparse
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Import shared soffice helper
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts" / "office"))
from soffice import find_soffice, get_soffice_env

# Constants
THUMBNAIL_WIDTH = 250  # Narrower than PPTX — document pages are portrait
CONVERSION_DPI = 100
MAX_COLS = 5
DEFAULT_COLS = 3
JPEG_QUALITY = 95
GRID_PADDING = 20
BORDER_WIDTH = 2
FONT_SIZE_RATIO = 0.10
LABEL_PADDING_RATIO = 0.4


def main():
    parser = argparse.ArgumentParser(
        description="Create page thumbnails from Word documents."
    )
    parser.add_argument("input", help="Input Word file (.docx)")
    parser.add_argument(
        "output_prefix",
        nargs="?",
        default="thumbnails",
        help="Output prefix for image files (default: thumbnails)",
    )
    parser.add_argument(
        "--cols",
        type=int,
        default=DEFAULT_COLS,
        help=f"Number of columns (default: {DEFAULT_COLS}, max: {MAX_COLS})",
    )

    args = parser.parse_args()

    cols = min(args.cols, MAX_COLS)
    if args.cols > MAX_COLS:
        print(f"Warning: Columns limited to {MAX_COLS}")

    input_path = Path(args.input)
    if not input_path.exists() or input_path.suffix.lower() != ".docx":
        print(f"Error: Invalid Word file: {args.input}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(f"{args.output_prefix}.jpg")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            page_images = convert_to_images(input_path, temp_path)

            if not page_images:
                print("Error: No pages found", file=sys.stderr)
                sys.exit(1)

            pages = [(img, f"Page {i+1}") for i, img in enumerate(page_images)]
            grid_files = create_grids(pages, cols, THUMBNAIL_WIDTH, output_path)

            print(f"Created {len(grid_files)} grid(s) from {len(page_images)} pages:")
            for grid_file in grid_files:
                print(f"  {grid_file}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def convert_to_images(docx_path: Path, temp_dir: Path) -> list:
    """Convert DOCX -> PDF -> JPG images using soffice and pdftoppm."""
    pdf_path = temp_dir / f"{docx_path.stem}.pdf"

    soffice = find_soffice()
    result = subprocess.run(
        [
            soffice,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(temp_dir),
            str(docx_path),
        ],
        capture_output=True,
        text=True,
        env=get_soffice_env(),
        timeout=120,
    )
    if result.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(
            f"PDF conversion failed (exit {result.returncode}):\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )

    result = subprocess.run(
        [
            "pdftoppm",
            "-jpeg",
            "-r", str(CONVERSION_DPI),
            str(pdf_path),
            str(temp_dir / "page"),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"pdftoppm failed:\n{result.stderr}")

    return sorted(temp_dir.glob("page-*.jpg"))


def create_grids(
    pages: list,
    cols: int,
    width: int,
    output_path: Path,
) -> list:
    """Create one or more grid images, splitting long documents across multiple files."""
    try:
        from PIL import Image
    except ImportError:
        print("Warning: Pillow not installed. Cannot create grid.")
        print("Install with: pip install Pillow --break-system-packages")
        return []

    max_per_grid = cols * (cols + 2)  # More rows per grid for documents
    grid_files = []

    for chunk_idx, start_idx in enumerate(range(0, len(pages), max_per_grid)):
        end_idx = min(start_idx + max_per_grid, len(pages))
        chunk_pages = pages[start_idx:end_idx]

        grid = create_grid(chunk_pages, cols, width)

        if len(pages) <= max_per_grid:
            grid_filename = output_path
        else:
            stem = output_path.stem
            suffix = output_path.suffix
            grid_filename = output_path.parent / f"{stem}-{chunk_idx + 1}{suffix}"

        grid_filename.parent.mkdir(parents=True, exist_ok=True)
        grid.save(str(grid_filename), quality=JPEG_QUALITY)
        grid_files.append(str(grid_filename))

    return grid_files


def create_grid(
    pages: list,
    cols: int,
    width: int,
) -> "Image.Image":
    """Create a single grid image with labeled page thumbnails."""
    from PIL import Image, ImageDraw, ImageFont

    font_size = int(width * FONT_SIZE_RATIO)
    label_padding = int(font_size * LABEL_PADDING_RATIO)

    with Image.open(pages[0][0]) as img:
        aspect = img.height / img.width
    height = int(width * aspect)

    rows = math.ceil(len(pages) / cols)
    grid_w = cols * width + (cols + 1) * GRID_PADDING
    grid_h = rows * (height + font_size + label_padding * 2) + (rows + 1) * GRID_PADDING

    grid = Image.new("RGB", (grid_w, grid_h), "white")
    draw = ImageDraw.Draw(grid)

    try:
        font = ImageFont.load_default(size=font_size)
    except Exception:
        font = ImageFont.load_default()

    for i, (img_path, label) in enumerate(pages):
        row, col = i // cols, i % cols
        x = col * width + (col + 1) * GRID_PADDING
        y_base = row * (height + font_size + label_padding * 2) + (row + 1) * GRID_PADDING

        # Label above thumbnail
        bbox = draw.textbbox((0, 0), label, font=font)
        text_w = bbox[2] - bbox[0]
        draw.text(
            (x + (width - text_w) // 2, y_base + label_padding),
            label,
            fill="black",
            font=font,
        )

        y_thumbnail = y_base + label_padding + font_size + label_padding

        with Image.open(img_path) as img:
            img.thumbnail((width, height), Image.Resampling.LANCZOS)
            w, h = img.size
            tx = x + (width - w) // 2
            ty = y_thumbnail + (height - h) // 2
            grid.paste(img, (tx, ty))

            if BORDER_WIDTH > 0:
                draw.rectangle(
                    [
                        (tx - BORDER_WIDTH, ty - BORDER_WIDTH),
                        (tx + w + BORDER_WIDTH - 1, ty + h + BORDER_WIDTH - 1),
                    ],
                    outline="gray",
                    width=BORDER_WIDTH,
                )

    return grid


if __name__ == "__main__":
    main()
