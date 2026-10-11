from types import SimpleNamespace

import httpx
import pytest
from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    RateLimitError,
)

from study_buddy import ai_service
from study_buddy.quiz import calculate_score


def test_demo_mode_returns_sample_study_plan(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    plan = ai_service.generate_study_plan("Science", "Rainbows", 2, 1)

    assert len(plan["schedule"]) == 2
    assert plan["schedule"][0]["day"] == 1


def test_ai_request_calls_client_and_returns_content(monkeypatch):
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="A helpful answer."))]
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            assert api_key == "test-key"
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    assert ai_service._request("Explain gravity") == "A helpful answer."
    assert captured["model"] == "gpt-4o-mini"


def test_tutor_falls_back_to_supported_content_after_connection_error(monkeypatch):
    class FakeCompletions:
        def create(self, **kwargs):
            raise APIConnectionError(request=None)

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    answer = ai_service.explain_topic("Python", "what is python")

    assert "Offline Demo Answer" in answer
    assert "high-level, general-purpose programming language" in answer
    assert "automation, web development, data analysis, and artificial intelligence" in answer
    assert 'print(f"Hello, {name}!")' in answer
    assert "Hello, Sam!" in answer


def test_missing_api_key_selects_offline_demo_without_provider_call(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic("SQL", "What is a SELECT query?")

    assert ai_service.is_demo_mode()
    assert ai_service.DEMO_LABEL in answer
    assert "SELECT name, age" in answer


def test_private_request_without_key_fails_clearly(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(ai_service.AIServiceError, match="No AI API key is configured"):
        ai_service._request("Explain a topic")


def test_demo_quiz_returns_only_relevant_available_questions(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    questions = ai_service.generate_quiz("SQL", "Explain a SELECT query", 10)

    assert len(questions) == 3
    assert len({question["question"] for question in questions}) == 3
    assert all("sql" in question["question"].casefold() or "select" in question["question"].casefold() for question in questions)
    assert all(question["answer_index"] in range(4) for question in questions)
    assert all("study" not in question["question"].casefold() for question in questions)
    assert calculate_score(
        questions,
        [question["answer_index"] for question in questions],
    ) == (3, [True, True, True])


def test_demo_tutor_uses_python_content_and_code_output(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic(
        "Python programming",
        "What is a Python list and how do I add an item?",
    )

    assert answer.startswith(ai_service.DEMO_LABEL)
    assert "Python lists" in answer
    assert "append" in answer
    assert "red 3" in answer
    assert "SELECT" not in answer


def test_python_language_explanation_is_available_offline(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic("python", "what is python")

    assert answer.startswith("**Offline Demo Answer**")
    assert "Python is a high-level, general-purpose programming language." in answer
    assert "automation, web development, data analysis, and artificial intelligence" in answer
    assert 'print(f"Hello, {name}!")' in answer
    assert "Hello, Sam!" in answer


def test_specific_python_question_beats_general_language_topic(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic(
        "Python",
        "Explain Python loops with an example and output.",
    )

    assert "Python loops" in answer
    assert "for number in [1, 2, 3]" in answer
    assert "Hello, Sam!" not in answer


@pytest.mark.parametrize(
    ("subject", "question", "expected"),
    [
        ("SQL", "What are the types of SQL commands?", "DDL"),
        ("SQL", "Explain SQL joins with examples.", "LEFT JOIN"),
        ("Machine learning", "What is machine learning?", "learn patterns from data"),
        ("Data analytics", "Explain data analytics.", "examining and organizing data"),
        ("General", "What is the difference between SQL and Python?", "complementary"),
    ],
)
def test_offline_answers_match_specific_question_intent(
    monkeypatch, subject, question, expected
):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic(subject, question)

    assert "Offline Demo Answer" in answer
    assert expected.casefold() in answer.casefold()


def test_offline_percentage_calculation_shows_steps_and_result(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic("Mathematics", "What is 25% of 400?")

    assert "25% of 400" in answer
    assert "(25 ÷ 100) × 400 = **100**" in answer


def test_offline_follow_up_uses_supported_conversation_context(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    history = [
        {"role": "user", "content": "What is Python?"},
        {
            "role": "assistant",
            "content": "Python is a high-level general-purpose programming language.",
        },
    ]

    answer = ai_service.explain_topic(
        "Python",
        "Can you show an example?",
        conversation_history=history,
    )

    assert "Offline Demo Answer" in answer
    assert "print(f\"Hello, {name}!\")" in answer


def test_demo_tutor_never_answers_sql_question_with_python_content(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic(
        "SQL",
        "How does SELECT with a WHERE clause work?",
    )

    assert "SQL SELECT queries" in answer
    assert "SELECT name, age" in answer
    assert "Python" not in answer


@pytest.mark.parametrize(
    ("subject", "question", "expected"),
    [
        ("Java", "What is a Java object?", "new Greeter()"),
        ("JavaScript", "How do const and let variables work?", "console.log"),
        ("HTML", "What does the body element contain?", "<body>"),
        ("CSS", "What does a class selector do?", ".notice"),
        ("Mathematics", "How do I add 2/7 and 3/7?", "5/7"),
        ("Science", "What is photosynthesis?", "carbon dioxide"),
        ("Data analytics", "How do I calculate the mean?", "(2 + 4 + 6) / 3"),
        ("AI", "What is artificial intelligence?", "broad field"),
        ("Machine learning", "What is supervised learning?", "target labels"),
    ],
)
def test_demo_tutor_matches_supported_subject_and_question(
    monkeypatch, subject, question, expected
):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    answer = ai_service.explain_topic(subject, question)

    assert ai_service.DEMO_LABEL in answer
    assert expected.casefold() in answer.casefold()


def test_demo_summary_is_topic_specific(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    summary = ai_service.summarize_topic("SQL", "Summarize the SQL SELECT statement")

    assert ai_service.DEMO_LABEL in summary
    assert "SQL SELECT queries" in summary
    assert "WHERE" in summary
    assert "study advice" not in summary.casefold()


def test_live_summary_uses_relevant_offline_content_after_quota(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def exhausted_provider(*args, **kwargs):
        raise ai_service.AIServiceError(
            "quota exhausted",
            allow_offline_fallback=True,
        )

    monkeypatch.setattr(ai_service, "_request", exhausted_provider)

    summary = ai_service.summarize_topic("SQL", "What is SQL?")

    assert "Offline Demo Answer" in summary
    assert "Structured Query Language" in summary


def test_live_quiz_uses_matching_offline_questions_after_quota(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def exhausted_provider(*args, **kwargs):
        raise ai_service.AIServiceError(
            "quota exhausted",
            allow_offline_fallback=True,
        )

    monkeypatch.setattr(ai_service, "_request_json", exhausted_provider)

    questions = ai_service.generate_quiz("SQL", "SQL joins", 5)

    assert len(questions) == 3
    assert all("join" in item["question"].casefold() for item in questions)
    assert calculate_score(
        questions,
        [item["answer_index"] for item in questions],
    )[0] == 3


def test_study_plan_uses_existing_local_generator_after_quota(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def exhausted_provider(*args, **kwargs):
        raise ai_service.AIServiceError(
            "quota exhausted",
            allow_offline_fallback=True,
        )

    monkeypatch.setattr(ai_service, "_request_json", exhausted_provider)

    plan = ai_service.generate_study_plan("Python", "loops", 2, 1)

    assert len(plan["schedule"]) == 2
    assert plan["topic"] == "loops"


@pytest.mark.parametrize(
    ("subject", "topic"),
    [
        ("Physics", "quantum entanglement"),
        ("Python", "SQL SELECT query"),
        ("SQL", "Python list"),
        ("Science", "rainbows"),
    ],
)
def test_demo_mode_explains_unsupported_or_mismatched_topics(
    monkeypatch, subject, topic
):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(ai_service.AIServiceError, match="No predefined offline answer"):
        ai_service.explain_topic(subject, topic)


def test_quota_fallback_does_not_answer_unsupported_topic(monkeypatch):
    class FakeCompletions:
        def create(self, **kwargs):
            raise RateLimitError(
                "insufficient_quota",
                response=httpx.Response(
                    429,
                    request=httpx.Request(
                        "POST",
                        "https://api.openai.com/v1/chat/completions",
                    ),
                ),
                body={
                    "error": {
                        "code": "insufficient_quota",
                        "message": "private provider details",
                    }
                },
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    with pytest.raises(ai_service.AIServiceError, match="No predefined offline answer"):
        ai_service.explain_topic("Python", "Explain quantum entanglement")


def test_demo_summary_rejects_unsupported_topic_instead_of_generic_advice(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(ai_service.AIServiceError, match="Supported offline topics"):
        ai_service.summarize_topic("Science", "black holes")


def test_demo_quiz_rejects_unsupported_topic(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(ai_service.AIServiceError, match="No predefined offline answer"):
        ai_service.generate_quiz("Science", "rainbows", 5)


def test_demo_knowledge_missing_file_is_user_safe(monkeypatch, tmp_path):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(
        ai_service,
        "DEMO_KNOWLEDGE_PATH",
        tmp_path / "missing-knowledge.json",
    )

    with pytest.raises(ai_service.AIServiceError, match="sample knowledge file"):
        ai_service.explain_topic("Python", "Python variables")


def test_live_tutor_sends_exact_question_to_provider(monkeypatch):
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="SQL answer."))]
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)
    exact_question = "Why does this SQL query return only adults?"

    answer = ai_service.explain_topic("SQL", exact_question)

    assert answer == "SQL answer."
    assert exact_question in captured["messages"][1]["content"]
    assert "Subject: SQL" in captured["messages"][1]["content"]


def test_live_tutor_sends_conversation_for_follow_up(monkeypatch):
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="Follow-up answer."))]
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)
    history = [
        {"role": "user", "content": "What is SQL?"},
        {"role": "assistant", "content": "SQL is a database language."},
    ]

    answer = ai_service.explain_topic(
        "SQL",
        "Show me a simple example.",
        conversation_history=history,
    )

    assert answer == "Follow-up answer."
    assert captured["messages"][1:] == [
        {"role": "user", "content": "What is SQL?"},
        {"role": "assistant", "content": "SQL is a database language."},
        {
            "role": "user",
            "content": captured["messages"][-1]["content"],
        },
    ]
    assert "Show me a simple example." in captured["messages"][-1]["content"]


def test_compatible_provider_base_url_is_configurable(monkeypatch):
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="Answer."))]
            )

    class FakeOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://compatible.example/v1")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    assert ai_service._request("test") == "Answer."
    assert captured["base_url"] == "https://compatible.example/v1"


@pytest.mark.parametrize("error_code", ["insufficient_quota", "credit_balance_exhausted"])
def test_provider_quota_error_returns_offline_python_answer(
    monkeypatch, caplog, error_code
):
    class FakeCompletions:
        def create(self, **kwargs):
            raise RateLimitError(
                error_code,
                response=httpx.Response(
                    429,
                    request=httpx.Request(
                        "POST",
                        "https://api.openai.com/v1/chat/completions",
                    ),
                ),
                body={
                    "error": {
                        "code": error_code,
                        "message": "sensitive provider detail",
                    }
                },
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    secret = "test-super-secret-key"
    monkeypatch.setenv("OPENAI_API_KEY", secret)
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    answer = ai_service.explain_topic("python", "what is python")

    assert "Offline Demo Answer" in answer
    assert "Python is a high-level, general-purpose programming language." in answer
    assert "automation, web development, data analysis, and artificial intelligence" in answer
    assert 'print(f"Hello, {name}!")' in answer
    assert "Hello, Sam!" in answer
    assert secret not in caplog.text
    assert "sensitive provider detail" not in caplog.text


def test_bad_request_insufficient_quota_uses_supported_offline_answer(monkeypatch):
    class FakeCompletions:
        def create(self, **kwargs):
            request = httpx.Request(
                "POST",
                "https://api.openai.com/v1/chat/completions",
            )
            response = httpx.Response(400, request=request)
            raise APIStatusError(
                "private insufficient quota detail",
                response=response,
                body={
                    "error": {
                        "code": "insufficient_quota",
                        "message": "private billing response",
                    }
                },
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    answer = ai_service.explain_topic("python", "what is python")

    assert "Offline Demo Answer" in answer
    assert "high-level, general-purpose programming language" in answer


def test_invalid_provider_key_uses_supported_offline_answer_without_leaking_details(
    monkeypatch, caplog
):
    class FakeCompletions:
        def create(self, **kwargs):
            raise AuthenticationError(
                "sensitive provider detail",
                response=httpx.Response(
                    401,
                    request=httpx.Request(
                        "POST",
                        "https://api.openai.com/v1/chat/completions",
                    ),
                ),
                body={"error": {"message": "sensitive provider detail"}},
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    secret = "test-super-secret-key"
    monkeypatch.setenv("OPENAI_API_KEY", secret)
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    answer = ai_service.explain_topic("SQL", "What is a SELECT query?")

    assert "Offline Demo Answer" in answer
    assert "SQL SELECT queries" in answer
    assert secret not in answer
    assert "sensitive provider detail" not in answer
    assert secret not in caplog.text
    assert "sensitive provider detail" not in caplog.text


def test_provider_connection_error_returns_offline_answer(monkeypatch):
    class FakeCompletions:
        def create(self, **kwargs):
            raise APIConnectionError(request=None)

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    answer = ai_service.explain_topic("SQL", "What is a SELECT query?")

    assert "Offline Demo Answer" in answer
    assert "SQL SELECT queries" in answer


def test_provider_connection_error_for_unsupported_topic_is_friendly(monkeypatch):
    class FakeCompletions:
        def create(self, **kwargs):
            raise APIConnectionError(request=None)

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    with pytest.raises(ai_service.AIServiceError, match="No predefined offline answer"):
        ai_service.explain_topic("Physics", "quantum entanglement")


def test_live_tutor_rejects_malformed_provider_response(monkeypatch):
    class FakeCompletions:
        def create(self, **kwargs):
            return SimpleNamespace(choices=[])

    class FakeOpenAI:
        def __init__(self, api_key):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "OpenAI", FakeOpenAI)

    with pytest.raises(ai_service.AIServiceError, match="incomplete"):
        ai_service.explain_topic("SQL", "What is a SELECT query?")


def test_live_quiz_rejects_malformed_json(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service, "_request", lambda prompt, json_response=False: "not json")

    with pytest.raises(ai_service.AIServiceError, match="invalid JSON"):
        ai_service.generate_quiz("SQL", "SELECT", 3)
