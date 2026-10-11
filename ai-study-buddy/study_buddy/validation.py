from __future__ import annotations

import math


def validate_non_empty_text(value: str, label: str, max_length: int = 120) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"Please enter a {label.lower()}.")
    if len(cleaned) > max_length:
        raise ValueError(f"{label} must be {max_length} characters or fewer.")
    return cleaned


def validate_topic(
    subject: str, topic: str, max_topic_length: int = 120
) -> tuple[str, str]:
    return (
        validate_non_empty_text(subject, "Subject"),
        validate_non_empty_text(topic, "Topic", max_topic_length),
    )


def validate_study_schedule(days: int, daily_hours: float) -> None:
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 30:
        raise ValueError("Choose a study plan between 1 and 30 days.")
    if (
        isinstance(daily_hours, bool)
        or not isinstance(daily_hours, (int, float))
        or not math.isfinite(daily_hours)
        or not 0.5 <= daily_hours <= 12
    ):
        raise ValueError("Daily study time must be between 0.5 and 12 hours.")
