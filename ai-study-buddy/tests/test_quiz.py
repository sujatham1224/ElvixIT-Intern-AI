import pytest

from study_buddy.quiz import calculate_score, validate_quiz_data


@pytest.fixture
def questions():
    return [
        {
            "question": "Which is correct?",
            "choices": ["A", "B", "C", "D"],
            "answer_index": 1,
            "explanation": "B is correct.",
        },
        {
            "question": "Pick the answer.",
            "choices": ["A", "B", "C", "D"],
            "answer_index": 3,
            "explanation": "D is correct.",
        },
    ]


def test_quiz_score_and_feedback(questions):
    assert calculate_score(questions, [1, 0]) == (1, [True, False])


def test_score_rejects_missing_or_invalid_answers(questions):
    with pytest.raises(ValueError, match="answer every"):
        calculate_score(questions, [1])
    with pytest.raises(ValueError, match="invalid"):
        calculate_score(questions, [1, 5])


@pytest.mark.parametrize(
    "invalid",
    [
        [],
        [{"question": "Q", "choices": ["A"], "answer_index": 0, "explanation": "Why"}],
        [{"question": "Q", "choices": ["A", "B", "C", "D"], "answer_index": True, "explanation": "Why"}],
    ],
)
def test_quiz_data_rejects_invalid_shapes(invalid):
    with pytest.raises(ValueError):
        validate_quiz_data(invalid)
