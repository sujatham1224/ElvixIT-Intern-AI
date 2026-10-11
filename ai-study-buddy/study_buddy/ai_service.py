
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Sequence

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)

from study_buddy.planner import (
    create_study_plan,
    validate_generated_plan,
)
from study_buddy.quiz import validate_quiz_data
from study_buddy.validation import (
    validate_study_schedule,
    validate_topic,
)

load_dotenv()

logger = logging.getLogger(__name__)
DEMO_KNOWLEDGE_PATH = (
    Path(__file__).resolve().parent.parent
    / "sample_data"
    / "demo_knowledge.json"
)
DEMO_LABEL = "**Offline Demo Answer**"


class AIServiceError(RuntimeError):
    """A friendly, user-safe error raised when AI content cannot be generated."""

    def __init__(
        self,
        message: str,
        *,
        allow_offline_fallback: bool = False,
        offline_topic_missing: bool = False,
    ) -> None:
        super().__init__(message)
        self.allow_offline_fallback = allow_offline_fallback
        self.offline_topic_missing = offline_topic_missing


def is_demo_mode() -> bool:
    """Return True when no compatible AI provider key is configured."""
    return not bool(os.getenv("OPENAI_API_KEY", "").strip())


def _request(
    prompt: str,
    json_response: bool = False,
    conversation_history: Sequence[dict[str, str]] = (),
) -> str:
    """Send a request to the AI model and return its text response."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if not api_key:
        raise AIServiceError(
            "No AI API key is configured. Enable a provider to use live AI, "
            "or choose a topic supported by the offline demo."
        )

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    if not model:
        model = "gpt-4o-mini"

    try:
        base_url = os.getenv("OPENAI_BASE_URL", "").strip()
        client_options: dict[str, str] = {"api_key": api_key}
        if base_url:
            client_options["base_url"] = base_url
        client = OpenAI(**client_options)

        messages: list[dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    "You are an accurate, helpful AI tutor. Interpret the full "
                    "latest question and answer its actual intent directly. "
                    "Use earlier turns only as context for follow-up questions. "
                    "Use clear beginner-friendly language. Never replace a "
                    "specific question with generic study advice. Do not invent "
                    "facts, calculations, code output, or sources. If essential "
                    "information is missing, ask one concise clarifying question."
                ),
            }
        ]
        for item in conversation_history[-10:]:
            role = item.get("role")
            content = item.get("content")
            if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                messages.append({"role": role, "content": content.strip()[:8000]})
        messages.append({"role": "user", "content": prompt})

        options: dict[str, Any] = {"model": model, "messages": messages}

        if json_response:
            options["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**options)
        content = response.choices[0].message.content

        if not isinstance(content, str) or not content.strip():
            raise AIServiceError(
                "The AI returned an empty or malformed response. Please try again."
            )

        return content

    except AuthenticationError as error:
        logger.warning("AI provider rejected authentication (%s).", type(error).__name__)
        raise AIServiceError(
            "The AI provider did not accept the configured API key. Check the key "
            "in your local .env file and restart the app.",
            allow_offline_fallback=True,
        ) from error
    except RateLimitError as error:
        logger.warning("AI provider rate/credit limit reached (%s).", type(error).__name__)
        raise AIServiceError(
            "The AI provider's request limit was reached or account credits are "
            "unavailable. Check your provider usage and billing, or use supported "
            "offline demo topics.",
            allow_offline_fallback=True,
        ) from error
    except (APIConnectionError, APITimeoutError) as error:
        logger.warning("AI provider connection failed (%s).", type(error).__name__)
        raise AIServiceError(
            "Could not connect to the AI provider. Check your internet connection "
            "and try again, or use supported offline demo topics.",
            allow_offline_fallback=True,
        ) from error
    except APIStatusError as error:
        logger.warning("AI provider returned an unsuccessful status (%s).", type(error).__name__)
        if _status_error_allows_offline_fallback(error):
            raise AIServiceError(
                "The AI provider is temporarily unavailable or has exhausted its "
                "quota.",
                allow_offline_fallback=True,
            ) from error
        raise AIServiceError(
            "The AI provider could not complete this request. Please try again "
            "later or check your provider configuration.",
            allow_offline_fallback=error.status_code >= 500,
        ) from error
    except OpenAIError as error:
        logger.warning("AI provider request failed (%s).", type(error).__name__)
        raise AIServiceError(
            "The AI provider could not complete this request. Please try again "
            "later or use supported offline demo topics."
        ) from error

    except (IndexError, AttributeError, TypeError) as error:
        raise AIServiceError(
            "The AI response was incomplete. Please try again."
        ) from error


def _status_error_allows_offline_fallback(error: APIStatusError) -> bool:
    if error.status_code == 429 or error.status_code >= 500:
        return True

    body = error.body
    if not isinstance(body, dict):
        return False
    details = body.get("error", body)
    if not isinstance(details, dict):
        return False
    code = details.get("code")
    return isinstance(code, str) and code.casefold() in {
        "insufficient_quota",
        "credit_balance_exhausted",
        "rate_limit_exceeded",
    }


def _request_json(prompt: str) -> Any:
    """Request JSON from the AI and parse the response."""
    try:
        return json.loads(_request(prompt, json_response=True))
    except (json.JSONDecodeError, TypeError) as error:
        raise AIServiceError(
            "The AI returned invalid JSON data. Please try again."
        ) from error


def _normalize_match_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9+#/]+", value.casefold()))


def _load_demo_topics() -> list[dict[str, Any]]:
    try:
        with DEMO_KNOWLEDGE_PATH.open(encoding="utf-8") as knowledge_file:
            content = json.load(knowledge_file)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        logger.warning("Offline knowledge data could not be loaded (%s).", type(error).__name__)
        raise AIServiceError(
            "Offline demo content is unavailable because its sample knowledge file "
            "could not be loaded. Restore sample_data/demo_knowledge.json or configure "
            "an AI API key."
        ) from error

    if not isinstance(content, dict) or not isinstance(content.get("topics"), list):
        raise AIServiceError(
            "Offline demo content has an invalid format. Restore "
            "sample_data/demo_knowledge.json or configure an AI API key."
        )

    validated_topics = []
    for record in content["topics"]:
        if (
            not isinstance(record, dict)
            or not all(
                isinstance(record.get(key), str) and record[key].strip()
                for key in ("subject", "title", "explanation", "summary")
            )
            or not all(
                isinstance(record.get(key), list)
                and record[key]
                and all(isinstance(alias, str) and alias.strip() for alias in record[key])
                for key in ("subject_aliases", "aliases")
            )
        ):
            raise AIServiceError(
                "Offline demo content has an invalid topic entry. Restore "
                "sample_data/demo_knowledge.json or configure an AI API key."
            )
        try:
            validated_quiz = validate_quiz_data(record.get("quiz"))
        except ValueError as error:
            raise AIServiceError(
                "Offline demo content has an invalid quiz entry. Restore "
                "sample_data/demo_knowledge.json or configure an AI API key."
            ) from error
        validated_topics.append({**record, "quiz": validated_quiz})
    if not validated_topics:
        raise AIServiceError(
            "The offline knowledge base has no available topics. Restore "
            "sample_data/demo_knowledge.json or configure an AI API key."
        )
    return validated_topics


def _subject_matches(subject: str, aliases: list[str]) -> bool:
    normalized_subject = _normalize_match_text(subject)
    return any(
        normalized_subject == _normalize_match_text(alias)
        or f" {_normalize_match_text(alias)} " in f" {normalized_subject} "
        for alias in aliases
    )


def _resolve_demo_topic(subject: str, topic: str) -> dict[str, Any]:
    records = _load_demo_topics()
    matched_subjects = [
        record
        for record in records
        if isinstance(record, dict)
        and isinstance(record.get("subject_aliases"), list)
        and _subject_matches(subject, record["subject_aliases"])
    ]
    normalized_query = f" {_normalize_match_text(topic)} "
    matches = []
    for record in matched_subjects:
        aliases = record.get("aliases")
        if not isinstance(aliases, list):
            continue
        for alias in aliases:
            if isinstance(alias, str):
                normalized_alias = _normalize_match_text(alias)
                if normalized_alias and f" {normalized_alias} " in normalized_query:
                    matches.append((len(normalized_alias), record))
    if matches:
        return max(matches, key=lambda match: match[0])[1]

    supported = []
    seen_subjects = set()
    for record in records:
        if not isinstance(record, dict):
            continue
        record_subject = record.get("subject")
        title = record.get("title")
        if isinstance(record_subject, str) and isinstance(title, str):
            if record_subject.casefold() not in seen_subjects:
                supported.append(f"{record_subject}: ")
                seen_subjects.add(record_subject.casefold())
            supported[-1] += f"{title}; "
    if not supported:
        supported_text = "The offline knowledge base has no supported topics."
    else:
        supported_text = "Supported offline topics include " + " ".join(
            entry.rstrip("; ") + "." for entry in supported
        )
    raise AIServiceError(
        f"No predefined offline answer is available for “{topic}” in {subject}. "
        f"{supported_text} Add an AI API key for broader, live answers.",
        offline_topic_missing=True,
    )


def _resolve_follow_up_topic(
    subject: str,
    topic: str,
    conversation_history: Sequence[dict[str, str]],
) -> dict[str, Any]:
    follow_up_markers = (
        "that",
        "this",
        "it",
        "those",
        "these",
        "more",
        "example",
        "again",
        "why",
        "how so",
        "what about",
        "can you show",
        "explain further",
    )
    normalized_question = _normalize_match_text(topic)
    if not conversation_history and any(
        candidate in normalized_question
        for candidate in ("example", "examples", "calculation", "calculate", "output")
    ):
        try:
            return _resolve_demo_topic(subject, "what is " + subject)
        except AIServiceError as error:
            if not error.offline_topic_missing:
                raise
    if not any(
        re.search(rf"\b{re.escape(marker)}\b", normalized_question)
        for marker in follow_up_markers
    ):
        raise AIServiceError(
            f"No predefined offline answer is available for “{topic}” in {subject}. "
            "Ask a new supported topic or configure an AI provider for broader "
            "answers.",
            offline_topic_missing=True,
        )
    for item in reversed(conversation_history):
        if item.get("role") != "user":
            continue
        previous_question = item.get("content", "")
        if not previous_question:
            continue
        try:
            return _resolve_demo_topic(subject, previous_question)
        except AIServiceError as error:
            if not error.offline_topic_missing:
                raise
    raise AIServiceError(
        "I can’t resolve that follow-up in offline mode because there isn’t a "
        "supported earlier topic in this conversation. Please restate the topic "
        "or configure an AI provider.",
        offline_topic_missing=True,
    )


def _resolve_question_or_follow_up(
    subject: str,
    topic: str,
    conversation_history: Sequence[dict[str, str]],
) -> dict[str, Any]:
    try:
        return _resolve_demo_topic(subject, topic)
    except AIServiceError as error:
        if not error.offline_topic_missing:
            raise
        return _resolve_follow_up_topic(subject, topic, conversation_history)


def _offline_calculation(subject: str, topic: str) -> str | None:
    if not _subject_matches(
        subject, ["math", "mathematics", "arithmetic"]
    ):
        return None
    match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*(\d+(?:\.\d+)?)",
        topic.casefold(),
    )
    if not match:
        return None
    from decimal import Decimal

    percentage, value = (Decimal(part) for part in match.groups())
    result = percentage * value / Decimal(100)
    return (
        f"{DEMO_LABEL}\n\n"
        f"**Calculation**\n{percentage}% of {value} is "
        f"({percentage} ÷ 100) × {value} = "
        f"**{format(result.normalize(), 'f')}**."
    )


def explain_topic(
    subject: str,
    topic: str,
    conversation_history: Sequence[dict[str, str]] = (),
) -> str:
    """Generate a topic-specific explanation."""
    subject, topic = validate_topic(subject, topic)

    if is_demo_mode():
        calculation = _offline_calculation(subject, topic)
        if calculation:
            return calculation
        record = _resolve_question_or_follow_up(
            subject, topic, conversation_history
        )
        return _format_offline_answer(record)

    prompt = f"""
You are an expert tutor teaching a beginner.

Subject: {subject}
Student's exact topic or question: {topic}

Earlier conversation (use only when relevant to a follow-up):
{json.dumps(list(conversation_history[-10:]), ensure_ascii=False)}

Your task:
- Answer the exact question entered by the student.
- Start with a direct, correct answer.
- Explain the topic in simple language.
- Include relevant facts and practical examples.
- Use headings and bullet points where useful.
- If it is a programming topic, include valid code and expected output.
- Explain what the code does.
- If it is a mathematics question, show the calculation steps.
- If it is an SQL question, provide a suitable SQL query and explain it.
- If it is a data analytics topic, include a relevant data example.
- If it is a science topic, explain it using established scientific facts.
- If the question is a definition, define the exact concept first.
- Do not answer with generic learning advice instead of the actual answer.
- Do not assume that the topic is related to Python unless the student says so.
- If the question is unclear, explain the most likely interpretation.
- Never invent facts. Clearly mention uncertainty if needed.

Use this structure when appropriate:

### Direct answer
Give the correct answer to the student's question.

### Explanation
Explain the concept in beginner-friendly language.

### Example
Give a relevant example. For code, include the output.

### Key points
List the most important things to remember.

Adapt the structure to the topic. Do not include irrelevant sections.

Now answer the student's exact question.
"""

    try:
        return _request(
            prompt,
            conversation_history=conversation_history,
        )
    except AIServiceError as error:
        if not error.allow_offline_fallback:
            raise
        calculation = _offline_calculation(subject, topic)
        if calculation:
            return calculation
        record = _resolve_question_or_follow_up(
            subject, topic, conversation_history
        )
        logger.info(
            "Using predefined offline tutor content after provider unavailability."
        )
        return _format_offline_answer(record)


def _format_offline_answer(record: dict[str, Any]) -> str:
    return (
        f"{DEMO_LABEL}\n\n"
        f"**Predefined topic: {record['title']}**\n\n"
        f"{record['explanation']}"
    )


def summarize_topic(subject: str, topic: str) -> str:
    """Generate a topic-specific summary."""
    subject, topic = validate_topic(subject, topic)

    if is_demo_mode():
        record = _resolve_demo_topic(subject, topic)
        return (
            f"{DEMO_LABEL}\n\n"
            f"**Predefined topic: {record['title']}**\n\n"
            f"### Overview\n{record['explanation'].splitlines()[0]}\n\n"
            f"### Key points\n{record['summary']}"
        )

    prompt = f"""
You are an accurate tutor creating study notes for a beginner.

Subject: {subject}
Topic or question: {topic}

Create a summary that is specifically about this topic.

Requirements:
1. Begin with a concise, accurate explanation of the topic.
2. Include the most important facts and concepts.
3. Define important technical terms in simple language.
4. Include a relevant example when useful.
5. For programming topics, include a small correct code example if appropriate.
6. Do not provide generic advice instead of a topic-specific summary.
7. Do not include unrelated information.
8. Never invent facts.

Use this format:

### Overview
A short, direct explanation of the topic.

### Key points
A bullet list of the most important facts.

### Example
A relevant example, if appropriate.

### Important terms
Important terms with simple definitions.
"""

    try:
        return _request(prompt)
    except AIServiceError as error:
        if not error.allow_offline_fallback:
            raise
        record = _resolve_demo_topic(subject, topic)
        return (
            f"{DEMO_LABEL}\n\n"
            f"**Predefined topic: {record['title']}**\n\n"
            f"### Overview\n{record['explanation'].splitlines()[0]}\n\n"
            f"### Key points\n{record['summary']}"
        )


def generate_study_plan(
    subject: str,
    topic: str,
    days: int,
    daily_hours: float,
) -> dict[str, Any]:
    """Generate a study plan for the requested topic."""
    subject, topic = validate_topic(subject, topic)
    validate_study_schedule(days, daily_hours)

    if is_demo_mode():
        return create_study_plan(subject, topic, days, daily_hours)

    prompt = f"""
Create a practical, topic-specific study plan for a beginner.

Subject: {subject}
Topic: {topic}
Duration: exactly {days} days
Study time: {daily_hours:g} hours per day

Return a JSON object with a "schedule" array containing exactly {days} items.

Each item must contain:
- "day": an integer, starting at 1 and increasing consecutively
- "focus": a non-empty string describing that day's topic
- "activities": an array of non-empty strings describing learning activities
- "hours": a number equal to {daily_hours:g}

Make the plan relevant to the specified subject and topic.
Arrange concepts in a sensible learning order.
Do not return Markdown or text outside the JSON object.
"""

    try:
        response = _request_json(prompt)
    except AIServiceError as error:
        if not error.allow_offline_fallback:
            raise
        logger.info("Using the local study planner after provider unavailability.")
        return create_study_plan(subject, topic, days, daily_hours)

    try:
        schedule = validate_generated_plan(
            response,
            days,
            daily_hours,
        )["schedule"]
    except ValueError as error:
        raise AIServiceError(str(error)) from error

    return {
        "subject": subject,
        "topic": topic,
        "days": days,
        "hours_per_day": float(daily_hours),
        "schedule": schedule,
    }


def generate_quiz(
    subject: str,
    topic: str,
    count: int,
) -> list[dict[str, Any]]:
    """Generate a topic-specific multiple-choice quiz."""
    subject, topic = validate_topic(subject, topic)

    if type(count) is not int or not 3 <= count <= 10:
        raise ValueError("Choose between 3 and 10 quiz questions.")

    if is_demo_mode():
        record = _resolve_demo_topic(subject, topic)
        try:
            questions = validate_quiz_data(record.get("quiz"))
        except ValueError as error:
            raise AIServiceError(
                f"Predefined quiz data for {record['title']} is invalid."
            ) from error
        return questions[:count]

    else:
        prompt = f"""
Create exactly {count} accurate, beginner-friendly multiple-choice questions.

Subject: {subject}
Topic: {topic}

Requirements:
- Every question must test knowledge of the specified topic.
- Do not generate unrelated or generic questions.
- Each question must have exactly four answer choices.
- Only one choice should be correct.
- The correct answer must be factually accurate.
- Provide a short explanation of why the answer is correct.
- Vary the questions instead of repeating the same question.
- Do not make up facts.

Return only a JSON object with a "questions" array.

Each question must have:
- "question": a string containing the question
- "choices": an array of exactly four strings
- "answer_index": an integer from 0 to 3 indicating the correct choice
- "explanation": a string explaining the correct answer

Return exactly {count} questions.
"""

        try:
            response = _request_json(prompt)
        except AIServiceError as error:
            if not error.allow_offline_fallback:
                raise
            record = _resolve_demo_topic(subject, topic)
            return validate_quiz_data(record.get("quiz"))[:count]
        questions = (
            response.get("questions")
            if isinstance(response, dict)
            else None
        )

    try:
        return validate_quiz_data(
            questions,
            expected_count=count,
        )
    except ValueError as error:
        raise AIServiceError(str(error)) from error
