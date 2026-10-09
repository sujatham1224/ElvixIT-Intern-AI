# AI Power BI Dashboard Prompt Generator

A responsive, browser-only planning tool that turns dashboard requirements into a structured prompt for an AI assistant. It recommends KPIs, Power BI visuals, slicers, data checks, DAX starting points, and a layout while clearly identifying unknowns and assumptions.

> **Prompt generator, not an AI integration:** This application does not send data to an AI service or execute a prompt. The generated text can be copied into an AI assistant of your choice. Prompt history is stored in the current browser using LocalStorage.

## Problem statement

Planning a dashboard often starts with incomplete requirements and vague requests. This tool guides users through describing their dataset, audience, domain, and business objective, then packages that context into a reusable prompt that asks for useful and appropriately qualified Power BI recommendations.

## Key features

- Structured project form with required-field validation and a custom business-domain option.
- Tailored prompts with business context, data/schema details, KPI ideas, chart suggestions, data checks, DAX templates, layout guidance, output format, and explicit constraints.
- Three selectable approaches: zero-shot, few-shot, and role-based prompting.
- Domain-aware KPI suggestions for Sales, Finance, HR, Marketing, Healthcare, Education, and custom domains.
- Conditional KPI badges include plain-language verification guidance; they do not claim to have profiled or confirmed the source data.
- Objective-aware visual recommendations with business questions, suggested fields, and reasoning.
- DAX starting points that use known names where possible and clearly remain unvalidated templates.
- Sample Sales, HR, and Financial Performance projects.
- Copy, save, reuse, delete, clear, and download actions for prompts.
- Recent prompt history stored locally in the browser (up to ten entries).
- Beginner-friendly prompt-engineering explainer and responsive accessible interface.
- Automated tests using Node.js built-ins; no third-party runtime dependencies.

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript using ES modules
- LocalStorage
- Node.js built-in test runner (development/testing only)

## Prompt-engineering concepts

- **Role prompting:** The role-based mode frames the response as work from an experienced Power BI developer and data analyst.
- **Context setting:** The prompt includes the user's project, domain, dataset description, schema, audience, period, complexity, and objective.
- **Zero-shot prompting:** Direct task instructions without a worked example.
- **Few-shot prompting:** A compact example demonstrates the requested recommendation structure.
- **Clear constraints:** The AI is told not to invent fields, relationships, business definitions, or data-quality findings.
- **Structured output:** The prompt uses named sections and asks for traceable KPI/visual recommendations, required fields, and caveats.

## Run locally

### Option 1: Open the page

Open `index.html` in a modern browser. If the browser blocks JavaScript modules when opened as a local file, use Option 2.

### Option 2: Start a local static server

Python is one convenient option if it is already installed:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>. Stop the server with `Ctrl+C`.

No API key, backend, build step, or package installation is required to use the application.

## Usage

1. Enter a project name, domain, dataset description, known table/column names, audience, and business objective.
2. Optionally specify a period, dashboard complexity, prompt technique, and desired deliverable.
3. Or load one of the Sales, HR, or Finance sample projects and adjust it.
4. Select **Generate prompt**. Review conditional KPI suggestions, chart recommendations, and DAX templates.
5. Copy the prompt into an AI assistant, save it in this browser, or download it as a text file.

The dataset description and schema are required to encourage data-aware prompts. Table names are optional. Missing or ambiguous fields are identified as unknowns instead of silently assumed.

## Sample inputs and prompt excerpt

The built-in Sales sample describes order-line data with `OrderDate`, `OrderID`, `Product`, `Category`, `Region`, `Quantity`, `SalesAmount`, and `Cost`; it asks a manager to compare monthly sales and profit trends by region and category. The Total Profit template may subtract `Cost` from `SalesAmount` only conditionally: the business must confirm that Cost is the matching total cost at the same order-line grain. The product-ranking visual uses `Product` only when it contains readable labels; otherwise, use a verified related product-name field.

A generated prompt excerpt follows this form:

```text
Selected prompting technique: Few-shot.
...
Project: Sales Performance Dashboard
Business domain: Sales
Target audience: Manager
...
Supplied table/column names: Orders, OrderDate, OrderID, Region, Category, SalesAmount, Cost
...
Total Sales: Sum of recognized sales or revenue.
Required fields: verified sales/revenue field.
...
KPI card — Total Profit: SUM(SalesAmount) - SUM(Cost)
CONDITIONAL — use this only after confirming Cost is matching total cost at the same order-line grain.
Product as category; SalesAmount as value. Confirm Product contains readable labels.
```

The exact recommendations and prompt contents vary with the form inputs. No generated recommendation should be treated as a confirmed result from the user's data.

## Tests

Run the automated suite with Node.js 18 or later:

```powershell
npm test
```

See [tests/test-cases.md](tests/test-cases.md) for the test scenarios. The browser UI should also be checked manually for validation messages, sample loading, copy permissions, file downloads, and history actions.

## Screenshots

No screenshots are included. Capture and add genuine screenshots of the running application here when available.

## Current limitations

- Prompts are generated locally; there is no AI model/API connection.
- KPI detection is intentionally conservative and based on supplied column-name text, not data profiling.
- DAX output is illustrative and must be validated against the actual semantic model and business definitions.
- Prompt history is browser-local, limited to ten entries, and is not synchronized across devices or browser profiles.
- Clipboard and download features depend on browser capabilities and permissions.

## Future enhancements

- Optional dataset file/schema import with explicit local processing and privacy guidance.
- More domain-specific KPI definitions and configurable business rules.
- A user-reviewed semantic-model mapping step before DAX generation.
- Exportable dashboard specification and richer accessibility checks.
- Optional, clearly consented AI API integration behind a separate configuration.

## Git and pull request workflow

From the project directory, initialize and publish a feature branch:

```powershell
git init
git switch -c feat/power-bi-prompt-generator
git add .
git commit -m "Build Power BI dashboard prompt generator"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin feat/power-bi-prompt-generator
```

Replace the remote URL with the target repository. If it is already a Git repository, skip `git init`; if the remote already exists, inspect it with `git remote -v` rather than adding it again.

Before opening a pull request, check the target repository's `CONTRIBUTING.md`, pull request template, branch naming rules, required checks, and code-of-conduct or licensing requirements. Create a PR from `feat/power-bi-prompt-generator` into the repository's stated base branch, summarize the user-facing behavior and tests, link any related issue, and complete the repository's required review/checklist steps. The target repository is not specified here, so its exact contribution rules cannot be asserted in advance.
