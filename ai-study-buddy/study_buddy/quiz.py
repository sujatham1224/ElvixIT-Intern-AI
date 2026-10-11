from __future__ import annotations

from typing import Any, Sequence


def validate_quiz_data(questions: Any, expected_count: int | None = None) -> list[dict[str, Any]]:
    if not isinstance(questions, list) or not questions:
        raise ValueError("The generated quiz did not contain any questions.")
    if expected_count is not None and len(questions) != expected_count:
        raise ValueError("The generated quiz did not include the requested number of questions.")
    validated = []
    for question in questions:
        if not isinstance(question, dict):
            raise ValueError("The generated quiz contains an invalid question.")
        prompt = question.get("question")
        choices = question.get("choices")
        answer_index = question.get("answer_index")
        explanation = question.get("explanation")
        if (
            not isinstance(prompt, str)
            or not prompt.strip()
            or not isinstance(choices, list)
            or len(choices) != 4
            or not all(isinstance(choice, str) and choice.strip() for choice in choices)
            or type(answer_index) is not int
            or not 0 <= answer_index < len(choices)
            or not isinstance(explanation, str)
            or not explanation.strip()
        ):
            raise ValueError("The generated quiz contains a question with invalid answer data.")
        validated.append(
            {
                "question": prompt.strip(),
                "choices": [choice.strip() for choice in choices],
                "answer_index": answer_index,
                "explanation": explanation.strip(),
            }
        )
    return validated


def calculate_score(
    questions: Sequence[dict[str, Any]], answers: Sequence[int]
) -> tuple[int, list[bool]]:
    validated = validate_quiz_data(list(questions))
    if len(answers) != len(validated):
        raise ValueError("Please answer every question before submitting.")
    if any(type(answer) is not int or not 0 <= answer < 4 for answer in answers):
        raise ValueError("One or more quiz answers are invalid.")
    feedback = [
        answer == question["answer_index"]
        for question, answer in zip(validated, answers)
    ]
    return sum(feedback), feedback
