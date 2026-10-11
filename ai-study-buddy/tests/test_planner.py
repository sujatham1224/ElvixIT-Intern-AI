import pytest

from study_buddy.planner import create_study_plan


def test_create_study_plan_has_one_entry_for_each_day():
    plan = create_study_plan(" Biology ", "Cells", 4, 1.5)

    assert plan["subject"] == "Biology"
    assert plan["topic"] == "Cells"
    assert plan["days"] == 4
    assert plan["hours_per_day"] == 1.5
    assert [day["day"] for day in plan["schedule"]] == [1, 2, 3, 4]
    assert all(day["hours"] == 1.5 and day["activities"] for day in plan["schedule"])


@pytest.mark.parametrize(
    ("days", "hours"),
    [(0, 1), (31, 1), (3, 0), (3, 12.5), (True, 1), (3, float("inf"))],
)
def test_create_study_plan_rejects_invalid_schedule(days, hours):
    with pytest.raises(ValueError):
        create_study_plan("Biology", "Cells", days, hours)
