            sig_block_style,
        ),
        Spacer(1, 6),
        Paragraph(
            "<b>Signature:</b> ________________________",
            sig_block_style,
        ),
    ]

    sig_table = Table(
        [
            [
                mentor_cell,
                coordinator_cell,
            ]
        ],
        colWidths=[
            270,
            270,
        ],
    )

    sig_table.setStyle(
        TableStyle(
            [
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (0, -1),
                    0,
                ),
                (
                    "LEFTPADDING",
                    (1, 0),
                    (1, -1),
                    40,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    0,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    0,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    0,
                ),
            ]
        )
    )

    story.append(
        KeepTogether(sig_table)
    )

    # ========================================================
    # BUILD PDF
    # ========================================================

    doc.build(story)

    # ========================================================
    # SUCCESS MESSAGE
    # ========================================================

    print(
        f"\n[SUCCESS] Generated: {doc_name}"
    )

    print(
        f" -> Found {len(students)} student(s) "
        f"and {total_commits} total commits."
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) > 1:

        chosen_interval = (
            sys.argv[1].lower()
        )

    else:

        chosen_interval = "weekly"

    if chosen_interval not in [
        "weekly",
        "monthly",
        "final",
    ]:

        print(
            "Invalid option."
        )

        print(
            "Usage:"
        )

        print(
            "  python report.py weekly"
        )

        print(
            "  python report.py monthly"
        )

        print(
