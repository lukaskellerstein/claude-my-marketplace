#!/usr/bin/env python3
"""
Add comments to an unpacked DOCX document.

Creates or updates the comment infrastructure files (comments.xml,
commentsExtended.xml, commentsIds.xml, commentsExtensible.xml, people.xml)
and outputs the XML markers needed to insert into document.xml.

Usage:
    python comment.py unpacked_dir "Comment text" --author "Author Name" [--id N]
    python comment.py unpacked_dir "Reply text" --author "Author Name" --reply-to N

Examples:
    python comment.py doc_unpacked "Please review this section" --author "Claude"
    python comment.py doc_unpacked "Agreed, looks good" --author "Claude" --reply-to 1
"""

import argparse
import random
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


NS_WML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS_W15 = "http://schemas.microsoft.com/office/word/2012/wordml"
NS_W16CID = "http://schemas.microsoft.com/office/word/2016/wordml/cid"
NS_W16CEX = "http://schemas.microsoft.com/office/word/2018/wordml/cex"

TEMPLATES_DIR = Path(__file__).parent.parent.parent.parent / "scripts" / "office" / "templates"


def find_next_comment_id(word_dir: Path) -> int:
    """Find the next available comment ID in the document."""
    comments_file = word_dir / "comments.xml"
    if not comments_file.exists():
        return 1

    content = comments_file.read_text(encoding="utf-8")
    ids = [int(m) for m in re.findall(r'w:id="(\d+)"', content)]
    return max(ids, default=0) + 1


def generate_para_id() -> str:
    """Generate a valid paraId (8-char hex, must be < 0x80000000)."""
    return f"{random.randint(0, 0x7FFFFFFF):08X}"


def ensure_comment_files(word_dir: Path) -> None:
    """
    Ensure all 4 comment XML files exist in the word/ directory.

    Copies from templates if they don't exist.
    """
    comment_files = {
        "comments.xml": "comments.xml",
        "commentsExtended.xml": "commentsExtended.xml",
        "commentsIds.xml": "commentsIds.xml",
        "commentsExtensible.xml": "commentsExtensible.xml",
    }

    for filename, template_name in comment_files.items():
        target = word_dir / filename
        if not target.exists():
            template = TEMPLATES_DIR / template_name
            if template.exists():
                shutil.copy2(template, target)
                print(f"Created: {filename}")
            else:
                print(f"Warning: Template not found: {template}")

    # Ensure people.xml exists
    people_target = word_dir / "people.xml"
    if not people_target.exists():
        people_template = TEMPLATES_DIR / "people.xml"
        if people_template.exists():
            shutil.copy2(people_template, people_target)
            print("Created: people.xml")


def add_comment(unpacked_dir: str, text: str, author: str,
                comment_id: int = None, reply_to: int = None) -> dict:
    """
    Add a comment to an unpacked DOCX document.

    Args:
        unpacked_dir: Path to unpacked DOCX directory
        text: Comment text
        author: Author name
        comment_id: Specific comment ID (auto-assigned if None)
        reply_to: If set, this is a reply to the comment with this ID

    Returns:
        Dict with comment info and XML markers to insert into document.xml
    """
    base = Path(unpacked_dir).resolve()
    word_dir = base / "word"

    if not word_dir.exists():
        raise FileNotFoundError(f"word/ directory not found in {base}")

    ensure_comment_files(word_dir)

    if comment_id is None:
        comment_id = find_next_comment_id(word_dir)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    para_id = generate_para_id()
    durable_id = generate_para_id()

    # 1. Add to comments.xml
    comments_file = word_dir / "comments.xml"
    content = comments_file.read_text(encoding="utf-8")

    comment_xml = (
        f'<w:comment w:id="{comment_id}" w:author="{author}" w:date="{now}" '
        f'w:initials="{author[0].upper()}">'
        f'<w:p w14:paraId="{para_id}" w14:textId="{generate_para_id()}">'
        f'<w:pPr><w:pStyle w:val="CommentText"/></w:pPr>'
        f'<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>'
        f'<w:annotationRef/></w:r>'
        f'<w:r><w:t xml:space="preserve">{text}</w:t></w:r>'
        f'</w:p></w:comment>'
    )

    content = content.replace("</w:comments>", f"{comment_xml}\n</w:comments>")
    comments_file.write_text(content, encoding="utf-8")

    # 2. Add to commentsExtended.xml (for replies and paraId tracking)
    ext_file = word_dir / "commentsExtended.xml"
    if ext_file.exists():
        ext_content = ext_file.read_text(encoding="utf-8")

        done_attr = 'w15:done="0"'
        parent_attr = f'w15:paraIdParent="{_find_para_id_for_comment(word_dir, reply_to)}"' if reply_to else ""

        ext_xml = (
            f'<w15:commentEx w15:paraId="{para_id}" {done_attr} {parent_attr}/>'
        )

        ext_content = ext_content.replace("</w15:commentsEx>", f"{ext_xml}\n</w15:commentsEx>")
        ext_file.write_text(ext_content, encoding="utf-8")

    # 3. Add to commentsIds.xml
    ids_file = word_dir / "commentsIds.xml"
    if ids_file.exists():
        ids_content = ids_file.read_text(encoding="utf-8")
        ids_xml = f'<w16cid:commentId w16cid:paraId="{para_id}" w16cid:durableId="{durable_id}"/>'
        ids_content = ids_content.replace("</w16cid:commentsIds>", f"{ids_xml}\n</w16cid:commentsIds>")
        ids_file.write_text(ids_content, encoding="utf-8")

    # 4. Add author to people.xml if not already present
    people_file = word_dir / "people.xml"
    if people_file.exists():
        people_content = people_file.read_text(encoding="utf-8")
        if f'w15:author="{author}"' not in people_content:
            person_xml = f'<w15:person w15:author="{author}"><w15:presenceInfo w15:providerId="None" w15:userId="{author}"/></w15:person>'
            people_content = people_content.replace("</w15:people>", f"{person_xml}\n</w15:people>")
            people_file.write_text(people_content, encoding="utf-8")

    # Generate markers for document.xml insertion
    range_start = f'<w:commentRangeStart w:id="{comment_id}"/>'
    range_end = f'<w:commentRangeEnd w:id="{comment_id}"/>'
    reference = (
        f'<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>'
        f'<w:commentReference w:id="{comment_id}"/></w:r>'
    )

    result = {
        "comment_id": comment_id,
        "para_id": para_id,
        "author": author,
        "text": text,
        "is_reply": reply_to is not None,
        "markers": {
            "range_start": range_start,
            "range_end": range_end,
            "reference": reference,
        },
    }

    print(f"Added comment #{comment_id} by {author}")
    print(f"\nInsert these markers into word/document.xml:")
    print(f"  Before the commented text: {range_start}")
    print(f"  After the commented text:  {range_end}")
    print(f"  After range_end (in a run): {reference}")

    return result


def _find_para_id_for_comment(word_dir: Path, comment_id: int) -> str:
    """Find the paraId for a given comment ID in commentsExtended.xml."""
    ext_file = word_dir / "commentsExtended.xml"
    if not ext_file.exists():
        return generate_para_id()

    # Need to cross-reference comments.xml to find the paraId
    comments_file = word_dir / "comments.xml"
    if comments_file.exists():
        content = comments_file.read_text(encoding="utf-8")
        # Find the paragraph in the comment with matching id
        match = re.search(
            rf'w:id="{comment_id}".*?w14:paraId="([0-9A-Fa-f]+)"',
            content, re.DOTALL
        )
        if match:
            return match.group(1)

    return generate_para_id()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add comments to unpacked DOCX")
    parser.add_argument("unpacked_dir", help="Path to unpacked DOCX directory")
    parser.add_argument("text", help="Comment text")
    parser.add_argument("--author", required=True, help="Comment author name")
    parser.add_argument("--id", type=int, default=None, help="Specific comment ID")
    parser.add_argument("--reply-to", type=int, default=None, help="Reply to comment ID")

    args = parser.parse_args()
    add_comment(args.unpacked_dir, args.text, args.author, args.id, args.reply_to)
