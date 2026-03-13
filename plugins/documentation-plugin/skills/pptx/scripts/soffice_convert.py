#!/usr/bin/env python3
"""
Convert PPTX to PDF using LibreOffice.

Handles sandboxed environments where AF_UNIX sockets may be blocked
by compiling and LD_PRELOADing a small shim that converts socket()
calls to socketpair() calls.

Usage:
    python soffice_convert.py input.pptx output.pdf
    python soffice_convert.py input.pptx  # outputs input.pdf in same dir
"""

import os
import shutil
import socket
import subprocess
import sys
import tempfile
from pathlib import Path


def _needs_shim() -> bool:
    """Check if AF_UNIX sockets are blocked (sandboxed environment)."""
    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.close()
        return False
    except OSError:
        return True


_SHIM_SO = Path(tempfile.gettempdir()) / "lo_socket_shim.so"

_SHIM_SOURCE = r"""
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <unistd.h>

static int (*real_socket)(int, int, int);
static int (*real_socketpair)(int, int, int, int[2]);
static int (*real_listen)(int, int);
static int (*real_accept)(int, struct sockaddr *, socklen_t *);
static int (*real_close)(int);
static int (*real_read)(int, void *, size_t);

static int is_shimmed[1024];
static int peer_of[1024];
static int wake_r[1024];
static int wake_w[1024];
static int listener_fd = -1;

__attribute__((constructor))
static void init(void) {
    real_socket     = dlsym(RTLD_NEXT, "socket");
    real_socketpair = dlsym(RTLD_NEXT, "socketpair");
    real_listen     = dlsym(RTLD_NEXT, "listen");
    real_accept     = dlsym(RTLD_NEXT, "accept");
    real_close      = dlsym(RTLD_NEXT, "close");
    real_read       = dlsym(RTLD_NEXT, "read");
    for (int i = 0; i < 1024; i++) {
        peer_of[i] = -1;
        wake_r[i]  = -1;
        wake_w[i]  = -1;
    }
}

int socket(int domain, int type, int protocol) {
    if (domain == AF_UNIX) {
        int fd = real_socket(domain, type, protocol);
        if (fd >= 0) return fd;
        int sv[2];
        if (real_socketpair(domain, type, protocol, sv) == 0) {
            if (sv[0] >= 0 && sv[0] < 1024) {
                is_shimmed[sv[0]] = 1;
                peer_of[sv[0]]    = sv[1];
                int wp[2];
                if (pipe(wp) == 0) {
                    wake_r[sv[0]] = wp[0];
                    wake_w[sv[0]] = wp[1];
                }
            }
            return sv[0];
        }
        errno = EPERM;
        return -1;
    }
    return real_socket(domain, type, protocol);
}

int listen(int sockfd, int backlog) {
    if (sockfd >= 0 && sockfd < 1024 && is_shimmed[sockfd]) {
        listener_fd = sockfd;
        return 0;
    }
    return real_listen(sockfd, backlog);
}

int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen) {
    if (sockfd >= 0 && sockfd < 1024 && is_shimmed[sockfd]) {
        if (wake_r[sockfd] >= 0) {
            char buf;
            real_read(wake_r[sockfd], &buf, 1);
        }
        errno = ECONNABORTED;
        return -1;
    }
    return real_accept(sockfd, addr, addrlen);
}

int close(int fd) {
    if (fd >= 0 && fd < 1024 && is_shimmed[fd]) {
        int was_listener = (fd == listener_fd);
        is_shimmed[fd] = 0;
        if (wake_w[fd] >= 0) {
            char c = 0;
            write(wake_w[fd], &c, 1);
            real_close(wake_w[fd]);
            wake_w[fd] = -1;
        }
        if (wake_r[fd] >= 0) { real_close(wake_r[fd]); wake_r[fd]  = -1; }
        if (peer_of[fd] >= 0) { real_close(peer_of[fd]); peer_of[fd] = -1; }
        if (was_listener)
            _exit(0);
    }
    return real_close(fd);
}
"""


def _ensure_shim() -> Path:
    """Compile the LD_PRELOAD shim if not already compiled."""
    if _SHIM_SO.exists():
        return _SHIM_SO

    src = Path(tempfile.gettempdir()) / "lo_socket_shim.c"
    src.write_text(_SHIM_SOURCE)
    subprocess.run(
        ["gcc", "-shared", "-fPIC", "-o", str(_SHIM_SO), str(src), "-ldl"],
        check=True,
        capture_output=True,
    )
    src.unlink()
    return _SHIM_SO


def get_soffice_env() -> dict:
    """Get environment dict for running LibreOffice."""
    env = os.environ.copy()
    env["SAL_USE_VCLPLUGIN"] = "svp"

    if _needs_shim():
        shim = _ensure_shim()
        env["LD_PRELOAD"] = str(shim)

    return env


def convert_pptx_to_pdf(input_path: str, output_path: str = None) -> str:
    """
    Convert a PPTX file to PDF using LibreOffice.

    Args:
        input_path: Path to the .pptx file
        output_path: Optional path for the output .pdf file.
                     If not given, replaces .pptx extension with .pdf.

    Returns:
        Path to the generated PDF file.
    """
    input_path = Path(input_path).resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if output_path:
        output_path = Path(output_path).resolve()
    else:
        output_path = input_path.with_suffix(".pdf")

    # LibreOffice outputs to the same directory as input, so we work in a temp dir
    # if the desired output location differs
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_input = Path(tmpdir) / input_path.name
        shutil.copy2(input_path, tmp_input)

        env = get_soffice_env()
        result = subprocess.run(
            [
                "soffice",
                "--headless",
                "--convert-to", "pdf",
                "--outdir", tmpdir,
                str(tmp_input),
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice conversion failed:\n{result.stderr}\n{result.stdout}"
            )

        # Find the generated PDF
        tmp_pdf = tmp_input.with_suffix(".pdf")
        if not tmp_pdf.exists():
            # Sometimes the name is slightly different
            pdfs = list(Path(tmpdir).glob("*.pdf"))
            if not pdfs:
                raise RuntimeError(
                    f"No PDF generated. LibreOffice output:\n{result.stdout}\n{result.stderr}"
                )
            tmp_pdf = pdfs[0]

        shutil.copy2(tmp_pdf, output_path)

    print(f"Converted: {output_path}")
    return str(output_path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python soffice_convert.py input.pptx [output.pdf]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    convert_pptx_to_pdf(inp, out)
