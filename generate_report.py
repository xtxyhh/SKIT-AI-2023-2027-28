import subprocess
from collections import defaultdict
import datetime
import io
import os
import sys
import html

import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


# ============================================================
# CONFIGURATION
# ============================================================

COLLEGE_NAME = (
    "Swami Keshvanand Institute of Technology, "
    "Management & Gramothan, Jaipur"
)

DEPARTMENT_NAME = "Department of Computer Science & Engineering"


# ============================================================
# GET REPOSITORY INFORMATION
# ============================================================

def get_repo_info():
    """
    Extracts the repository name and current Git branch.
    """

    repo_name = "Project-Repository"
    branch_name = "main"

    # --------------------------------------------------------
    # Get repository root
    # --------------------------------------------------------
    try:
        root_path = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            encoding="utf-8",
            errors="replace",
        ).strip()

        repo_name = os.path.basename(root_path)

    except Exception:

        # ----------------------------------------------------
        # Fallback: Get repository name from remote URL
        # ----------------------------------------------------
        try:
            remote_url = subprocess.check_output(
                ["git", "config", "--get", "remote.origin.url"],
                encoding="utf-8",
                errors="replace",
            ).strip()

            repo_name = (
                remote_url.rstrip("/")
                .split("/")[-1]
                .replace(".git", "")
            )

        except Exception:
            repo_name = os.path.basename(os.getcwd())

    # --------------------------------------------------------
    # Get current branch
    # --------------------------------------------------------
    try:
        branch_name = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            encoding="utf-8",
            errors="replace",
        ).strip()

    except Exception:
        pass

    return repo_name, branch_name
