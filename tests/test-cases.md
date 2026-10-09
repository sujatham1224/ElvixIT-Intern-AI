# Test cases

The automated suite is in `tests/promptGenerator.test.js` and runs with Node's built-in test runner (`npm test`). It covers prompt construction, the three techniques, KPI availability, objective-led chart selection, DAX safeguards, missing schema, and prompt-history storage.

| # | Scenario | Expected result |
|---|---|---|
| 1 | Generate from a complete Sales project | Prompt includes project-specific context, columns, audience, and objective. |
| 2 | Select Zero-shot | Technique is explained and no few-shot example is included. |
| 3 | Select Few-shot | Prompt includes a sample recommendation structure. |
| 4 | Select Role-based | Prompt sets an experienced Power BI developer and data analyst role. |
| 5 | Sales fields are present but business definitions are unconfirmed | Sales KPI cards remain conditional until calculation definitions are verified. |
| 6 | Select Finance and HR domains | Domain-specific KPI recommendations are returned. |
| 7 | Use a custom domain | Conservative objective-led KPI ideas are returned conditionally. |
| 8 | Objective asks for trends, comparisons, and proportions | Line, bar, and qualified donut chart recommendations are included. |
| 9 | Requested chart fields are absent | Recommendations use explicit placeholders rather than asserting unknown columns exist. |
| 10 | DAX table and fields are supplied | Templates use those names and remain explicitly unvalidated. |
| 11 | DAX fields are unknown | Templates show placeholders and are not represented as executable. |
| 12 | Table or column schema is missing | Prompt requests clarification instead of inventing field names. |
| 13 | History is empty or contains invalid JSON | Empty state is returned; invalid data yields an explicit error without throwing. |
| 14 | History contains malformed entries | Valid entries are retained and skipped entries are reported. |
| 15 | Save, reuse/read, delete, then clear history | Each operation returns the expected updated history. |
| 16 | More than ten prompts are saved | Only the newest ten are retained. |
| 17 | Browser storage throws | The storage error is surfaced to the UI caller. |
| 18 | Sales schema includes OrderDate and SalesAmount | The trend line uses OrderDate on X and SalesAmount on Y and explains the time-trend question. |
| 19 | Sales schema lacks a required line-chart field | A conditional recommendation uses a placeholder and does not claim the visual is ready. |
| 20 | Sales schema includes ProductName and SalesAmount | A bar chart uses ProductName by SalesAmount to rank top-performing products. |
| 21 | Product is present | The bar chart uses it as the category and asks users to confirm it contains readable labels. |
| 22 | Product and ProductName are absent | The bar chart requests a verified related product-name field rather than using a product identifier as a label. |
| 23 | SalesAmount and Cost are supplied without a profit field | Total Profit may use their difference only conditionally, pending confirmation of matching total cost at the same order-line grain. |
| 24 | A verified profit field is supplied | Total Profit uses that field, while retaining business-definition validation. |
| 25 | Sales fields are missing | Separate Total Sales, Total Profit, and Profit Margin cards remain conditional; margin uses `DIVIDE([Total Profit], [Total Sales])`. |
| 26 | Finance KPI fields are not confirmed | Conditional badges remain visible and explain the field definitions and scope/denominator checks needed for Total Revenue, Total Expenses, Net Profit, and Expense Ratio. |
| 27 | Any KPI recommendation is conditional | Its visible card and generated prompt provide a concise verification explanation without claiming that the data was profiled. |

The form's browser-side validation and user-facing controls (copy, download, sample loading, clear, history toggling) should also be exercised manually in a browser. Clipboard access and download behavior depend on browser permissions and environment.

## Verification performed for this delivery

Interactive checks in the browser passed for: blocking an empty submission; loading and generating the Sales and Finance samples; displaying all expected conditional KPI warnings in both cards and generated prompts; checking Sales guidance for Total Sales, Total Profit, Profit Margin, Sales Growth, and Average Order Value; checking Finance guidance for Total Revenue, Total Expenses, Net Profit, and Expense Ratio; preserving conditional badges; and confirming no browser JavaScript errors. Earlier browser checks also cover sample loading, recommendation rendering, prompt history, and responsive layout.

The automated Node.js test file is included, but could not be executed in the authoring environment because neither `node` nor `npm` is installed. Run `npm test` in an environment with Node.js 18 or later to execute it.
