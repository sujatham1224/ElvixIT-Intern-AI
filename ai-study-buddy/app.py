
from __future__ import annotations

from datetime import datetime

import streamlit as st

from study_buddy.ai_service import (
    AIServiceError,
    explain_topic,
    generate_quiz,
    generate_study_plan,
    is_demo_mode,
    summarize_topic,
)
from study_buddy.planner import create_study_plan
from study_buddy.quiz import calculate_score
from study_buddy.validation import validate_study_schedule, validate_topic


st.set_page_config(
    page_title="AI Study Buddy",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded",
)


# Custom CSS: improve text visibility and dashboard styling
st.markdown(
    """
    <style>
    .block-container {
        max-width: 1180px;
        padding-top: 2rem;
        padding-bottom: 3rem;
    }

    /* Dashboard metric cards */
    [data-testid="stMetric"] {
        background-color: #F5F7FC;
        border: 1px solid #D9E2F0;
        padding: 20px;
        border-radius: 14px;
    }

    [data-testid="stMetricLabel"],
    [data-testid="stMetricLabel"] *,
    [data-testid="stMetricValue"],
    [data-testid="stMetricValue"] * {
        color: #172033 !important;
    }

    [data-testid="stMetricValue"] {
        font-size: 32px !important;
        font-weight: 700 !important;
    }

    /* Hero banner */
    .hero {
        background: linear-gradient(120deg, #EEF2FF, #F0FDFA);
        border: 1px solid #E0E7FF;
        border-radius: 18px;
        padding: 1.5rem 1.7rem;
        margin-bottom: 1.25rem;
    }

    .hero h1 {
        color: #1E293B !important;
        margin-bottom: 0.4rem;
    }

    .hero p {
        color: #475569 !important;
    }

    .muted {
        color: #475569 !important;
    }

    @media (max-width: 640px) {
        .block-container {
            padding-left: 1rem;
            padding-right: 1rem;
        }

        .hero {
            padding: 1.1rem;
        }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def initialize_state() -> None:
    if "activity" not in st.session_state:
        st.session_state.activity = []

    if "quiz_questions" not in st.session_state:
        st.session_state.quiz_questions = None

    if "quiz_result" not in st.session_state:
        st.session_state.quiz_result = None

    if "tutor_conversation" not in st.session_state:
        st.session_state.tutor_conversation = []

    if "page" not in st.session_state:
        st.session_state.page = "Dashboard"


def navigate_to_page(destination: str) -> None:
    """Navigate using a callback before the sidebar radio is rendered."""
    st.session_state.page = destination


def record_activity(
    kind: str,
    topic: str,
    detail: str = "",
) -> None:
    st.session_state.activity.insert(
        0,
        {
            "kind": kind,
            "topic": topic,
            "detail": detail,
            "at": datetime.now().strftime("%b %d, %Y · %I:%M %p"),
        },
    )

    st.session_state.activity = st.session_state.activity[:100]


def render_dashboard() -> None:
    st.markdown(
        '<div class="hero">'
        '<h1>📚 Your AI Study Buddy</h1>'
        '<p class="muted">'
        'A calmer, clearer way to learn—one topic at a time.'
        '</p></div>',
        unsafe_allow_html=True,
    )

    activity = st.session_state.activity

    topics = {
        item["topic"].strip().casefold()
        for item in activity
        if item["topic"]
    }

    quiz_results = [
        int(item["detail"].split("/")[0])
        for item in activity
        if item["kind"] == "Quiz completed"
        and "/" in item["detail"]
    ]

    average_score = (
        round(sum(quiz_results) / len(quiz_results))
        if quiz_results
        else 0
    )

    first, second, third = st.columns(3)

    first.metric("Topics explored", len(topics))
    second.metric("Study activities", len(activity))
    third.metric(
        "Average quiz score",
        f"{average_score}%" if quiz_results else "—",
    )

    st.subheader("Pick up where you left off")

    cards = st.columns(3)

    destinations = [
        (
            "🗓️",
            "Plan a study session",
            "Turn a goal into a manageable daily plan.",
            "Study planner",
        ),
        (
            "💡",
            "Ask your AI tutor",
            "Get a tricky idea explained in plain language.",
            "AI tutor",
        ),
        (
            "🧠",
            "Check your understanding",
            "Practice with a short multiple-choice quiz.",
            "Quiz",
        ),
    ]

    for column, (
        icon,
        title,
        description,
        destination,
    ) in zip(cards, destinations):
        with column:
            st.markdown(f"### {icon} {title}")
            st.write(description)

            st.button(
                f"Open {destination}",
                key=f"dashboard_{destination}",
                on_click=navigate_to_page,
                args=(destination,),
                use_container_width=True,
            )

    st.subheader("Recent study activity")

    if not activity:
        st.info(
            "Your learning history will appear here "
            "after your first study activity."
        )
    else:
        for item in activity[:5]:
            label = f"**{item['kind']}** · {item['topic']}"

            if item["detail"]:
                label += f" · {item['detail']}"

            st.markdown(
                f"{label}  \n<small>{item['at']}</small>",
                unsafe_allow_html=True,
            )


def render_planner() -> None:
    st.title("🗓️ Study planner")
    st.write(
        "Break a subject into a practical schedule you can follow."
    )

    with st.form("planner_form"):
        subject = st.text_input(
            "Subject",
            placeholder="e.g. Biology",
        )

        topic = st.text_input(
            "Topic",
            placeholder="e.g. Photosynthesis",
        )

        left, right = st.columns(2)

        days = left.number_input(
            "Number of days",
            min_value=1,
            max_value=30,
            value=5,
            step=1,
        )

        hours = right.number_input(
            "Study hours per day",
            min_value=0.5,
            max_value=12.0,
            value=1.0,
            step=0.5,
        )

        submitted = st.form_submit_button(
            "Create my plan",
            type="primary",
        )

    if submitted:
        try:
            subject, topic = validate_topic(subject, topic)
            validate_study_schedule(days, hours)

            with st.spinner("Putting your study plan together..."):
                plan = generate_study_plan(
                    subject,
                    topic,
                    int(days),
                    float(hours),
                )

            st.session_state.study_plan = plan

            record_activity(
                "Study plan created",
                topic,
                f"{int(days)} days",
            )

        except (ValueError, AIServiceError) as error:
            st.error(str(error))

    plan = st.session_state.get("study_plan")

    if plan:
        st.subheader(
            f"Your {plan['days']}-day plan for {plan['topic']}"
        )

        st.caption(
            f"{plan['subject']} · "
            f"{plan['hours_per_day']:g} hours each day"
        )

        for item in plan["schedule"]:
            with st.expander(
                f"Day {item['day']}: {item['focus']}",
                expanded=item["day"] == 1,
            ):
                st.write(f"**Time:** {item['hours']:g} hours")

                for activity in item["activities"]:
                    st.markdown(f"- {activity}")


def render_tutor() -> None:
    st.title("💡 AI tutor")

    st.write(
        "Ask a natural-language question. Live AI can answer broadly; "
        "offline demo mode answers only listed, predefined topics."
    )

    with st.form("tutor_form"):
        subject = st.text_input(
            "Subject",
            placeholder="e.g. Physics",
        )

        topic = st.text_area(
            "Your question or topic",
            placeholder=(
                "Ask a question or paste code to explain, e.g. "
                "In Python, what is a list and how do I add an item?"
            ),
            height=120,
        )

        submitted = st.form_submit_button(
            "Explain this topic",
            type="primary",
        )

    if submitted:
        st.session_state.pop("tutor_answer", None)
        st.session_state.pop("tutor_topic", None)
        try:
            subject, topic = validate_topic(
                subject, topic, max_topic_length=4000
            )
            conversation = st.session_state.tutor_conversation

            with st.spinner(
                "Your tutor is preparing an explanation..."
            ):
                answer = explain_topic(
                    subject,
                    topic,
                    conversation_history=conversation,
                )

            st.session_state.tutor_answer = answer
            st.session_state.tutor_topic = topic
            conversation.extend(
                [
                    {"role": "user", "content": topic},
                    {"role": "assistant", "content": answer},
                ]
            )
            st.session_state.tutor_conversation = conversation[-20:]

            record_activity("Topic explained", topic)

        except (ValueError, AIServiceError) as error:
            st.error(str(error))

    if st.session_state.tutor_conversation:
        st.subheader("Conversation")
        for message in st.session_state.tutor_conversation:
            with st.chat_message(message["role"]):
                if message["role"] == "user":
                    st.markdown(message["content"])
                else:
                    st.markdown(message["content"])
        if st.button("Clear tutor conversation"):
            st.session_state.tutor_conversation = []
            st.session_state.pop("tutor_answer", None)
            st.session_state.pop("tutor_topic", None)
            st.rerun()


def render_summary() -> None:
    st.title("📝 Topic summary")

    st.write(
        "Enter a topic or a specific question to summarize. Offline summaries "
        "are available only for listed, predefined topics."
    )

    with st.form("summary_form"):
        subject = st.text_input(
            "Subject",
            placeholder="e.g. History",
        )

        topic = st.text_input(
            "Topic or question to summarize",
            placeholder="e.g. Explain SQL SELECT with a WHERE filter",
        )

        submitted = st.form_submit_button(
            "Create summary",
            type="primary",
        )

    if submitted:
        st.session_state.pop("topic_summary", None)
        st.session_state.pop("summary_topic", None)
        try:
            subject, topic = validate_topic(subject, topic)

            with st.spinner("Finding the key ideas..."):
                summary = summarize_topic(subject, topic)

            st.session_state.topic_summary = summary
            st.session_state.summary_topic = topic

            record_activity("Summary created", topic)

        except (ValueError, AIServiceError) as error:
            st.error(str(error))

    if st.session_state.get("topic_summary"):
        st.subheader(st.session_state.summary_topic)
        st.markdown(st.session_state.topic_summary)


def render_quiz() -> None:
    st.title("🧠 Quiz time")

    st.write(
        "Generate practice questions and get helpful feedback "
        "on your answers."
    )

    with st.form("quiz_form"):
        subject = st.text_input(
            "Subject",
            placeholder="e.g. Earth science",
        )

        topic = st.text_input(
            "Quiz topic",
            placeholder="e.g. SQL SELECT queries",
        )

        count = st.slider(
            "Number of questions",
            min_value=3,
            max_value=10,
            value=5,
        )

        submitted = st.form_submit_button(
            "Generate quiz",
            type="primary",
        )

    if submitted:
        st.session_state.quiz_questions = None
        st.session_state.quiz_result = None
        try:
            subject, topic = validate_topic(subject, topic)

            with st.spinner("Writing your questions..."):
                questions = generate_quiz(
                    subject,
                    topic,
                    count,
                )

            for index in range(10):
                st.session_state.pop(
                    f"quiz_answer_{index}",
                    None,
                )

            st.session_state.quiz_questions = questions
            st.session_state.quiz_topic = topic
            st.session_state.quiz_requested_count = count
            st.session_state.quiz_result = None

        except (ValueError, AIServiceError) as error:
            st.error(str(error))

    questions = st.session_state.quiz_questions

    if questions:
        requested_count = st.session_state.get(
            "quiz_requested_count", len(questions)
        )
        if len(questions) < requested_count:
            st.info(
                f"Offline demo has {len(questions)} topic-specific questions. "
                f"It returned those {len(questions)} rather than filling the "
                f"request for {requested_count} with unrelated questions."
            )
        st.subheader(
            f"Practice: {st.session_state.quiz_topic}"
        )

        with st.form("quiz_answers"):
            answers = []

            for index, question in enumerate(questions):
                st.markdown(
                    f"**{index + 1}. {question['question']}**"
                )

                answers.append(
                    st.radio(
                        f"Choose an answer for question {index + 1}",
                        options=range(len(question["choices"])),
                        format_func=lambda option,
                        choices=question["choices"]: choices[option],
                        key=f"quiz_answer_{index}",
                        label_visibility="collapsed",
                    )
                )

            submitted = st.form_submit_button(
                "Submit answers",
                type="primary",
            )

        if submitted:
            score, feedback = calculate_score(
                questions,
                answers,
            )

            st.session_state.quiz_result = (score, feedback)

            record_activity(
                "Quiz completed",
                st.session_state.quiz_topic,
                f"{score}/{len(questions)}",
            )

    if st.session_state.quiz_result:
        score, feedback = st.session_state.quiz_result
        total = len(questions)
        percentage = round(score / total * 100)

        st.success(
            f"You scored {score} out of {total} ({percentage}%)."
        )

        if percentage == 100:
            st.write(
                "Excellent work—you have a strong grasp of this topic!"
            )
        elif percentage >= 60:
            st.write(
                "Good progress. Review any missed explanations, "
                "then try again."
            )
        else:
            st.write(
                "Keep going! Revisit the topic summary and "
                "give the quiz another try."
            )

        with st.expander(
            "Review answers and explanations",
            expanded=True,
        ):
            for index, (question, is_correct) in enumerate(
                zip(questions, feedback),
                1,
            ):
                marker = "✅" if is_correct else "💡"

                st.markdown(
                    f"{marker} **{index}. "
                    f"{question['choices'][question['answer_index']]}**  \n"
                    f"{question['explanation']}"
                )


def render_progress() -> None:
    st.title("📈 Learning progress")

    activity = st.session_state.activity

    quiz_results = [
        (
            item["topic"],
            int(item["detail"].split("/")[0]),
            int(item["detail"].split("/")[1]),
        )
        for item in activity
        if item["kind"] == "Quiz completed"
        and "/" in item["detail"]
    ]

    unique_topics = len(
        {
            item["topic"].casefold()
            for item in activity
            if item["topic"]
        }
    )

    first, second, third = st.columns(3)

    first.metric("Unique topics", unique_topics)
    second.metric("Quizzes completed", len(quiz_results))

    best_score = max(
        (
            round(score / total * 100)
            for _, score, total in quiz_results
            if total
        ),
        default=0,
    )

    third.metric(
        "Best quiz score",
        f"{best_score}%" if quiz_results else "—",
    )

    st.subheader("Topic history")

    if not activity:
        st.info(
            "No progress to show yet. Try a tutor explanation, "
            "a study plan, or a quiz."
        )
        return

    for item in activity:
        detail = f" ({item['detail']})" if item["detail"] else ""

        st.markdown(
            f"- **{item['topic']}** — "
            f"{item['kind']}{detail}  \n"
            f"  {item['at']}"
        )


def main() -> None:
    initialize_state()

    with st.sidebar:
        st.title("📚 Study Buddy")
        st.caption("Your personal learning companion")

        pages = [
            "Dashboard",
            "Study planner",
            "AI tutor",
            "Summary",
            "Quiz",
            "Progress",
        ]

        selected = st.radio(
            "Navigate",
            pages,
            key="page",
            label_visibility="collapsed",
        )

        st.divider()
        st.caption("Small steps add up. You’ve got this! ✨")

    if is_demo_mode():
        st.info(
            "Demo mode is active: no `OPENAI_API_KEY` was found. Tutor and "
            "summary responses use predefined content only for supported topics; "
            "quizzes are limited to matching sample questions. Add a key for live AI."
        )

    renderers = {
        "Dashboard": render_dashboard,
        "Study planner": render_planner,
        "AI tutor": render_tutor,
        "Summary": render_summary,
        "Quiz": render_quiz,
        "Progress": render_progress,
    }

    renderers[selected]()


if __name__ == "__main__":
    main()
