from __future__ import annotations

import math
from typing import Any

from study_buddy.validation import validate_study_schedule, validate_topic


def create_study_plan(
    subject: str, topic: str, days: int, daily_hours: float
) -> dict[str, Any]:
    """Create a predictable offline plan that can also power demo mode."""
    subject, topic = validate_topic(subject, topic)
    validate_study_schedule(days, daily_hours)
    schedule = []
    for day in range(1, days + 1):
        progress = day / days
        if progress <= 0.25:
            focus = "Build your foundations"
            activities = [
                f"Learn the core ideas behind {topic}.",
                "Write down new terms and questions.",
            ]
        elif progress <= 0.7:
            focus = "Practice and connect ideas"
            activities = [
                f"Work through examples related to {topic}.",
                "Explain one key idea in your own words.",
            ]
        else:
            focus = "Review and check your understanding"
            activities = [
                f"Review your notes on {topic}.",
                "Try a short practice quiz and revisit anything unclear.",
            ]
        schedule.append(
            {
                "day": day,
                "focus": focus,
                "activities": activities,
                "hours": float(daily_hours),
            }
        )
    return {
        "subject": subject,
        "topic": topic,
        "days": days,
        "hours_per_day": float(daily_hours),
        "schedule": schedule,
    }


def validate_generated_plan(
    plan: Any, expected_days: int, expected_hours: float
) -> dict[str, Any]:
    if not isinstance(plan, dict) or not isinstance(plan.get("schedule"), list):
        raise ValueError("The generated study plan has an invalid format.")
    schedule = plan["schedule"]
    if len(schedule) != expected_days:
        raise ValueError("The generated study plan did not include each requested day.")
    for day_number, item in enumerate(schedule, start=1):
        if (
            not isinstance(item, dict)
            or type(item.get("day")) is not int
            or item.get("day") != day_number
            or not isinstance(item.get("focus"), str)
            or not item["focus"].strip()
            or not isinstance(item.get("activities"), list)
            or not item["activities"]
            or not all(isinstance(entry, str) and entry.strip() for entry in item["activities"])
            or isinstance(item.get("hours"), bool)
            or not isinstance(item.get("hours"), (int, float))
            or not math.isfinite(item["hours"])
            or item["hours"] != expected_hours
        ):
            raise ValueError("The generated study plan contains an invalid day.")
    return plan
