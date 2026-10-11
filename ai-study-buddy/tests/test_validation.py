import pytest

from study_buddy.validation import validate_non_empty_text, validate_study_schedule, validate_topic


def test_validate_topic_trims_input():
    assert validate_topic(" Math ", " Fractions ") == ("Math", "Fractions")


@pytest.mark.parametrize("value", ["", "  ", "x" * 121])
def test_validate_non_empty_text_rejects_blank_or_long_values(value):
    with pytest.raises(ValueError):
        validate_non_empty_text(value, "Topic")


def test_validate_study_schedule_accepts_boundary_values():
    assert validate_study_schedule(1, 0.5) is None
    assert validate_study_schedule(30, 12) is None
