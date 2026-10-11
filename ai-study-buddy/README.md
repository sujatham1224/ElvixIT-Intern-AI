# AI Study Buddy

AI Study Buddy is a beginner-friendly study assistant built with Python and Streamlit. It helps students plan study time, understand unfamiliar topics, review concise summaries, practice with quizzes, and keep a lightweight learning history.

## Problem statement

Students often have difficulty turning a broad learning goal into manageable work, understanding unfamiliar terms, and checking what they have learned. Study resources can feel fragmented, and many AI tools require setup before a learner can try them.

## Solution

AI Study Buddy brings a study planner, tutor, summarizer, quiz maker, and progress view into one small web app. It works immediately in clearly labeled demo mode without an API key. Add an OpenAI API key to request live AI-generated responses.

## Features

- Dashboard cards for explored topics, study activities, and average quiz score.
- Study plans for 1–30 days with 0.5–12 study hours per day.
- Beginner-friendly topic explanations and key-point summaries.
- Multiple-choice quizzes with validated question formats, scoring, and explanations.
- Topic-specific offline explanations, summaries, and quizzes for a published list of predefined topics.
- Session-based topic history and quiz progress.
- Demo responses, input validation, loading indicators, friendly errors, and empty states.
- Responsive layout, labeled form controls, and keyboard-friendly Streamlit widgets.

## Architecture

The app keeps the UI separate from reusable services. `app.py` renders the pages and records session activity. `study_buddy/ai_service.py` calls the OpenAI API or serves clearly marked demo content; `planner.py`, `quiz.py`, and `validation.py` own testable business rules. External API responses are checked before the UI displays generated plans and quizzes.

## Folder structure

```text
.
├── app.py
├── study_buddy/
│   ├── __init__.py
│   ├── ai_service.py
│   ├── planner.py
│   ├── quiz.py
│   └── validation.py
├── sample_data/
│   └── demo_knowledge.json
├── screenshots/
├── tests/
│   ├── test_ai_service.py
│   ├── test_planner.py
│   ├── test_quiz.py
│   └── test_validation.py
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt
```

## Technologies

- Python 3.10 or newer
- Streamlit
- OpenAI Python SDK (optional live AI)
- python-dotenv
- pytest
- Git and GitHub

## Setup

1. Install Python 3.10 or newer.
2. Clone the repository and open a terminal in its folder.
3. Create and activate a virtual environment:

   **Windows PowerShell**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   **macOS / Linux**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

4. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
5. (Optional) Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to your own key. Never commit `.env`.
6. Start the app:
   ```bash
   streamlit run app.py
   ```

Open the local URL printed by Streamlit in your browser. Without a key, tutor and summary content is available only for the offline topics listed below. Offline tutor answers are labeled **Offline Demo Answer**. If a topic or subject does not match the knowledge base, the app explains that limitation rather than inventing an answer. When a live tutor request hits a provider quota/rate limit or a network failure, the tutor tries the matching predefined offline answer; unsupported questions still receive a clear limitation message. Demo quizzes return only the available matching questions; they do not repeat unrelated questions to fill the selected count.

## Environment configuration

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | API key used for live tutor, summary, plan, and quiz generation. |
| `OPENAI_MODEL` | No | OpenAI chat model name; defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | No | Optional base URL for an OpenAI-compatible chat-completions provider. |

Do not put a real key in source code, screenshots, commits, or public issue reports. API usage may incur provider charges.

## Supported offline demo topics

The offline knowledge base is in `sample_data/demo_knowledge.json`. It contains predefined explanations, summaries, examples (including code output where applicable), and topic-matched quiz questions for:

- **Python:** language overview; variables; lists; loops.
- **SQL:** language overview; command categories; `SELECT`/`WHERE`; joins.
- **HTML:** language overview; document structure.
- **CSS:** stylesheet overview; selectors.
- **JavaScript:** language overview; variables (`let` and `const`).
- **Data analytics:** overview; arithmetic mean.
- **Java:** classes and objects.
- **Mathematics:** adding fractions with a common denominator; one-step linear equations; percentage calculations (for example, “What is 25% of 400?”).
- **Science / biology:** photosynthesis.
- **AI:** artificial intelligence basics.
- **Machine learning:** general introduction; supervised learning.
- **General technology:** SQL and Python comparison.

These are deliberately narrow, curated examples—not an offline general-purpose AI. The demo matches a supported subject and concept in the submitted question. Closely related but unlisted questions may still be reported as unsupported. For broader natural-language questions, configure a real OpenAI API key. Python’s predefined language overview answers “what is python” with a short definition and runnable example.

## Enabling live AI responses

1. Copy `.env.example` to `.env` in the project root.
2. Set `OPENAI_API_KEY` to an API key for an OpenAI-compatible chat completions provider. Optionally set `OPENAI_MODEL`; the default is `gpt-4o-mini`.
3. For a compatible provider endpoint, set `OPENAI_BASE_URL` to its API base URL. Leave it blank to use OpenAI's default endpoint.
4. Save `.env` and restart `streamlit run app.py`.

The AI Tutor keeps a short conversation history in the current Streamlit session and sends recent turns to the provider so follow-up questions can refer to earlier messages. Use **Clear tutor conversation** to remove that session history.

Never paste the key into the app's subject/question fields, source files, screenshots, or GitHub. The app does not display raw provider error details or the API key. When authentication fails, credits or request limits are exhausted, or the provider is unreachable, the Tutor uses matching offline content when available; unsupported questions still receive a clear limitation message. Other provider errors, including malformed responses, are reported with safe, actionable messages.

## Run command

```bash
streamlit run app.py
```

## Screenshots

The `screenshots/` folder is reserved for application captures. To add one, run the app locally, capture the browser, and save an image there. No screenshots are included yet.

## Sample outputs

- **Study plan:** A five-day plan typically starts with foundations, moves into practice, and finishes with review and a self-check.
- **Demo tutor:** For “What is a Python list?”, returns a predefined Python list explanation, code sample, and output (`red 3`).
- **Demo summary:** For “Summarize SQL SELECT,” returns a predefined SQL summary including `SELECT`, `FROM`, and `WHERE`.
- **Demo quiz:** SQL `SELECT` returns only the curated SQL questions available; choosing a higher count does not add unrelated study-habit questions.

## Tests

Run the test suite from the project root:

```bash
python -m pytest -q
```

The tests cover plan generation, input validation, quiz validation and scoring, subject-specific offline explanations and summaries, unsupported/mismatched subjects, quiz-topic correctness, missing sample data, and mocked AI provider success, connection, rate/credit, and malformed-response errors. They do not make external API calls.

## Git and GitHub

To start tracking a new local copy with Git:

```bash
git init
git add .
git commit -m "Initial AI Study Buddy app"
```

Create an empty repository on GitHub, then connect and push your local branch (replace the URL with your repository's URL):

```bash
git remote add origin <your-repository-url>
git branch -M main
git push -u origin main
```

The `.gitignore` excludes virtual environments, local `.env` files, Python caches, and editor files. Before pushing, check that no API key or other secret is staged.

## Limitations

- Progress is stored in the current browser session and is not persisted across sessions or users.
- Offline responses cover only the listed, predefined topics; they cannot answer arbitrary questions.
- Curated demo content is intentionally small and should still be checked against course materials.
- Live AI responses can be inaccurate; verify important information with trusted course materials.
- This app does not include authentication, cloud storage, or a production deployment setup.

## Future enhancements

- Persist personal progress with an opt-in database.
- Add exportable study plans and spaced-repetition reminders.
- Let students provide course notes for grounded summaries and quizzes.
- Add more providers and deployment guidance.
- Include real screenshots and accessibility testing feedback.

## Contributing

Contributions are welcome:

1. Fork the repository and create a focused feature branch.
2. Install the dependencies and run `python -m pytest -q`.
3. Make a small, clearly scoped change and add or update tests.
4. Never commit `.env`, API keys, or other secrets.
5. Open a pull request describing the change, how it was tested, and any limitations.

For bugs, include the steps to reproduce and the expected behavior. Remove personal or secret data from logs before sharing them.
