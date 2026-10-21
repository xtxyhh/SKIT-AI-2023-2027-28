
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict
import subprocess
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

TEAM = [
    "xtxyhh",
    "Nikhil-Choudhary-From-Skit",
    "Yash-Vardhan-Singh-Tanwar-From-Skit",
    "priyank0408",
]

REPORT_DIR = Path("weekly_reports")
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def run_git(*args):
    """Run a git command and return its output."""
    result = subprocess.run(
        ["git", *args],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def get_week_period():
    """
    Generate the report for the previous seven days.
    Git timestamps are compared in UTC.
    """
    now = datetime.now(timezone.utc)
    end = now
    start = now - timedelta(days=7)
    return start, end


def get_commits(start, end):
    """Get actual non-merge commits in the reporting period."""
    since = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    until = end.strftime("%Y-%m-%dT%H:%M:%SZ")

    output = run_git(
        "log",
        "--all",
        "--no-merges",
        f"--since={since}",
        f"--until={until}",
        "--date=iso-strict",
        "--pretty=format:%H%x1f%an%x1f%ae%x1f%ad%x1f%s",
    )

    commits = []

    if not output:
        return commits

    for line in output.splitlines():
        parts = line.split("\x1f", 4)
        if len(parts) != 5:
            continue

        commit_hash, author, email, date, subject = parts

        commits.append({
            "hash": commit_hash,
            "author": author.strip(),
            "email": email.strip().lower(),
            "date": date.strip(),
            "subject": subject.strip(),
        })

    return commits


def get_author_aliases():
    """
    Map common GitHub author identities to repository usernames.
    Extend this mapping if a contributor uses multiple Git identities.
    """
    aliases = {
        "xtxyhh": "xtxyhh",
        "nikhil-choudhary-from-skit": "Nikhil-Choudhary-From-Skit",
        "yash-vardhan-singh-tanwar-from-skit":
            "Yash-Vardhan-Singh-Tanwar-From-Skit",
        "priyank0408": "priyank0408",
    }

    # GitHub noreply email addresses can contain usernames.
    # Matching is conservative; unknown identities are not guessed.
    return aliases


def identify_contributor(commit, aliases):
    """Match known author names/emails to the four roster members."""
    author = commit["author"].strip().lower()
    email = commit["email"]

    # Exact author-name match
    if author in aliases:
        return aliases[author]

    # Exact username match inside a noreply email or address
    for alias, canonical_name in aliases.items():
        if alias in email:
            return canonical_name

    return None


def make_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=23,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D"),
        spaceAfter=8,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#17365D"),
        spaceBefore=8,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name="SmallCell",
        parent=styles["BodyText"],
        fontSize=8,
        leading=10,
        wordWrap="CJK",
    ))

    return styles


def safe_paragraph(value, style):
    """Escape repository text before rendering it as PDF markup."""
    from xml.sax.saxutils import escape
    return Paragraph(escape(str(value)), style)


def build_report():
    start, end = get_week_period()
    commits = get_commits(start, end)
    aliases = get_author_aliases()

    activity = {
        member: [] for member in TEAM
    }

    unrecognized = []

    for commit in commits:
        member = identify_contributor(commit, aliases)

        if member:
            activity[member].append(commit)
        else:
            unrecognized.append(commit)

    report_date = datetime.now().astimezone().date()
    filename = REPORT_DIR / (
        f"weekly_progress_report_{report_date.isoformat()}.pdf"
    )

    styles = make_styles()
    doc = SimpleDocTemplate(
        str(filename),
        pagesize=landscape(A4),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="Weekly Team Progress Report",
        author="Project Team",
    )

    story = []

    story.append(Paragraph(
        "WEEKLY TEAM PROGRESS REPORT",
        styles["ReportTitle"],
    ))

    story.append(Paragraph(
        f"Reporting period: {start.strftime('%d %b %Y %H:%M UTC')} "
        f"to {end.strftime('%d %b %Y %H:%M UTC')}",
        styles["Normal"],
    ))

    story.append(Paragraph(
        f"Report generated: "
        f"{datetime.now().astimezone().strftime('%d %b %Y, %I:%M %p %Z')}",
        styles["Normal"],
    ))

    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph(
        "1. Team Summary",
        styles["SectionHeading"],
    ))

    summary_data = [[
        "Contributor",
        "Recorded Commits",
        "Activity Status",
    ]]

    for member in TEAM:
        count = len(activity[member])
        status = (
            "Commits recorded"
            if count
            else "No matching commits recorded"
        )

        summary_data.append([
            safe_paragraph(member, styles["SmallCell"]),
            str(count),
            status,
        ])

    summary_table = Table(
        summary_data,
        colWidths=[90 * mm, 40 * mm, 90 * mm],
        repeatRows=1,
    )

    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17365D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B7C9D6")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
            colors.white,
            colors.HexColor("#F1F5F9"),
        ]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    story.append(summary_table)
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph(
        "2. Individual Progress",
        styles["SectionHeading"],
    ))

    for member in TEAM:
        member_commits = activity[member]

        story.append(Paragraph(
            member,
            styles["Heading3"],
        ))

        if not member_commits:
            story.append(Paragraph(
                "No matching commits were recorded for this contributor "
                "during the reporting period. This does not establish "
                "whether work was completed outside Git commits.",
                styles["Normal"],
            ))
            story.append(Spacer(1, 3 * mm))
            continue

        detail_data = [[
            "Date (UTC)",
            "Commit",
            "Commit message",
        ]]

        for commit in member_commits:
            detail_data.append([
                safe_paragraph(
                    commit["date"][:10],
                    styles["SmallCell"],
                ),
                safe_paragraph(
                    commit["hash"][:10],
                    styles["SmallCell"],
                ),
                safe_paragraph(
                    commit["subject"],
                    styles["SmallCell"],
                ),
            ])

        detail_table = Table(
            detail_data,
            colWidths=[30 * mm, 28 * mm, 162 * mm],
            repeatRows=1,
        )

        detail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0),
             colors.HexColor("#D9EAF7")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.35,
             colors.HexColor("#B7C9D6")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))

        story.append(detail_table)
        story.append(Spacer(1, 4 * mm))

    if unrecognized:
        story.append(PageBreak())
        story.append(Paragraph(
            "3. Unmatched Git Author Identities",
            styles["SectionHeading"],
        ))
        story.append(Paragraph(
            "The following commits were found in the reporting period, "
            "but their author identities did not match the configured "
            "four-person roster. Review these identities and update the "
            "alias mapping if appropriate.",
            styles["Normal"],
        ))
        story.append(Spacer(1, 3 * mm))

        unmatched_data = [[
            "Author",
            "Email",
            "Commit",
            "Message",
        ]]

        for commit in unrecognized:
            unmatched_data.append([
                safe_paragraph(commit["author"], styles["SmallCell"]),
                safe_paragraph(commit["email"], styles["SmallCell"]),
                safe_paragraph(commit["hash"][:10], styles["SmallCell"]),
                safe_paragraph(commit["subject"], styles["SmallCell"]),
            ])

        unmatched_table = Table(
            unmatched_data,
            colWidths=[45 * mm, 65 * mm, 28 * mm, 82 * mm],
            repeatRows=1,
        )

        unmatched_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0),
             colors.HexColor("#FCE8D5")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.35,
             colors.HexColor("#C8C8C8")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))

        story.append(unmatched_table)

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(
        "Reporting note: This report summarizes Git commits discoverable "
        "in the repository for the specified period. It does not verify "
        "work that was not committed or pushed, and commit counts alone "
        "do not measure the quality or total amount of work performed.",
        styles["Italic"],
    ))

    doc.build(story)

    print(f"Report created: {filename}")
    print(f"Team members included: {len(TEAM)}")
    print(f"Commits found in reporting period: {len(commits)}")

    return filename


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "weekly"

    if mode != "weekly":
        print(f"Unsupported report mode: {mode}")
        sys.exit(1)

    build_report()
