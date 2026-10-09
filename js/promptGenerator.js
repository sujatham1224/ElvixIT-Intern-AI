const DOMAIN_KPIS = {
  Sales: [
    { name: "Total Sales", description: "Sum of recognized sales or revenue.", requiredGroups: [["sales", "revenue"]] },
    { name: "Total Profit", description: "Sales less costs, using a consistent cost definition.", requiredGroups: [["profit"]] },
    { name: "Profit Margin", description: "Profit divided by sales; confirm the chosen profit and sales fields.", requiredGroups: [["profit"], ["sales", "revenue"]] },
    { name: "Sales Growth", description: "Period-over-period sales change; needs comparable date periods.", requiredGroups: [["sales", "revenue"], ["date", "time", "month", "year", "period"]] },
    { name: "Average Order Value", description: "Sales divided by distinct orders.", requiredGroups: [["sales", "revenue"], ["order"]] }
  ],
  Finance: [
    { name: "Total Revenue", description: "Sum of recognized revenue.", requiredGroups: [["revenue", "sales"]] },
    { name: "Total Expenses", description: "Sum of expense amounts under an agreed expense definition.", requiredGroups: [["expense", "cost"]] },
    { name: "Net Profit", description: "Revenue less expenses for the same accounting scope.", requiredGroups: [["revenue", "sales"], ["expense", "cost"]] },
    { name: "Expense Ratio", description: "Expenses divided by revenue for comparable periods.", requiredGroups: [["expense", "cost"], ["revenue", "sales"]] }
  ],
  HR: [
    { name: "Total Employees", description: "Employee count at a defined point in time.", requiredGroups: [["employee", "headcount", "staff"]] },
    { name: "Attrition Rate", description: "Departures divided by an agreed average headcount.", requiredGroups: [["termination", "attrition", "departure"], ["employee", "headcount", "staff"]] },
    { name: "Average Salary", description: "Average salary with currency and employee inclusion rules defined.", requiredGroups: [["salary", "compensation", "pay"]] },
    { name: "Department-wise Headcount", description: "Employee count grouped by department.", requiredGroups: [["employee", "headcount", "staff"], ["department"]] }
  ],
  Marketing: [
    { name: "Campaign Conversion Rate", description: "Conversions divided by a defined campaign response or visit count.", requiredGroups: [["conversion"], ["lead", "visit", "response"]] },
    { name: "Cost per Lead", description: "Campaign spend divided by qualified leads.", requiredGroups: [["cost", "spend"], ["lead"]] },
    { name: "Return on Ad Spend", description: "Attributed revenue divided by advertising spend.", requiredGroups: [["revenue", "sales"], ["spend", "cost"]] }
  ],
  Healthcare: [
    { name: "Patient Volume", description: "Count of patients or encounters, following the chosen counting rule.", requiredGroups: [["patient", "encounter", "visit"]] },
    { name: "Average Length of Stay", description: "Average stay duration for eligible completed admissions.", requiredGroups: [["admission", "discharge"], ["stay", "duration"]] },
    { name: "Appointment Attendance Rate", description: "Attended appointments divided by scheduled appointments.", requiredGroups: [["appointment"], ["attendance", "status"]] }
  ],
  Education: [
    { name: "Student Enrollment", description: "Student count for the selected term and enrollment status.", requiredGroups: [["student", "enrollment"]] },
    { name: "Course Completion Rate", description: "Course completions divided by eligible enrollments.", requiredGroups: [["course"], ["completion"], ["enrollment"]] },
    { name: "Average Assessment Score", description: "Average score with grading scale and attempt rules defined.", requiredGroups: [["score", "grade"], ["assessment"]] }
  ]
};

const TECHNIQUES = {
  "zero-shot": {
    label: "Zero-shot",
    explanation: "Zero-shot gives the assistant a clear task and context without examples. It is useful for straightforward requests and lets the model propose an appropriate structure.",
    instruction: "Complete the requested task directly from the context below. Do not rely on examples or invent details."
  },
  "few-shot": {
    label: "Few-shot",
    explanation: "Few-shot includes a compact example of the desired answer shape. It helps encourage consistent, scannable recommendations.",
    instruction: "Follow the structure demonstrated in the example, while tailoring every recommendation to the project details below."
  },
  "role-based": {
    label: "Role-based",
    explanation: "Role-based prompting sets a relevant expert perspective. It is useful when you want recommendations grounded in Power BI implementation and analysis.",
    instruction: "Act as an experienced Power BI developer and data analyst who translates business questions into practical, maintainable dashboard plans."
  }
};

const OUTPUT_GUIDANCE = {
  "Dashboard plan": "Focus the response on purpose, users, page structure, navigation, and implementation sequence.",
  "KPI list": "Prioritize KPI definitions, calculation logic, required fields, and caveats.",
  "Chart recommendations": "Prioritize visual choices, the question each answers, field mappings, and accessibility.",
  "DAX guidance": "Prioritize measure templates, assumptions, time-intelligence prerequisites, and validation steps.",
  "Complete dashboard blueprint": "Provide a complete blueprint covering KPIs, visuals, filters, data preparation, DAX, layout, and validation."
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function splitNames(value) {
  return normalizeText(value)
    .split(/[,;\n]+/)
    .map((item) => item.trim().replace(/^[\w .-]+:\s*/, ""))
    .filter(Boolean);
}

function fieldMatches(columns, alternatives) {
  return columns.some((column) => alternatives.some((term) => column.toLowerCase().includes(term)));
}

function availableColumns(columns, terms) {
  return columns.filter((column) => terms.some((term) => column.toLowerCase().includes(term)));
}

function isNumericColumn(column) {
  const normalized = column.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return /sales|revenue|profit|amount|cost|expense|score|salary|quantity|total|headcount/.test(normalized) ||
    /(^|[^a-z])count([^a-z]|$)/.test(normalized);
}

function normalizeColumnName(column) {
  return column.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findSalesColumn(columns) {
  const preferred = columns.find((column) => normalizeColumnName(column) === "salesamount");
  return preferred || columns.find((column) => /(?:sales|revenue)(?:amount|total|value)?$/.test(normalizeColumnName(column)));
}

function findProfitColumn(columns) {
  return columns.find((column) => /profit(?:amount)?$/.test(normalizeColumnName(column)));
}

function findCostColumn(columns) {
  return columns.find((column) => /^(?:cost|costamount|costtotal)$/.test(normalizeColumnName(column)));
}

function findOrderColumn(columns) {
  return columns.find((column) => /^order(?:id|number|no)$/.test(normalizeColumnName(column)));
}

function findDateColumn(columns) {
  const preferred = columns.find((column) => normalizeColumnName(column) === "orderdate");
  return preferred || columns.find((column) => /(?:date|datetime)$/.test(normalizeColumnName(column)));
}

function findProductColumn(columns) {
  const preferredNames = ["product", "productname"];
  return preferredNames
    .map((name) => columns.find((column) => normalizeColumnName(column) === name))
    .find(Boolean);
}

function getConditionalKpiExplanation(domain, name, columns) {
  const hasSales = Boolean(findSalesColumn(columns));
  const hasProfit = Boolean(findProfitColumn(columns));
  const hasCost = Boolean(findCostColumn(columns));
  const hasDate = Boolean(findDateColumn(columns));
  const hasOrder = Boolean(findOrderColumn(columns));

  if (domain === "Finance") {
    const explanations = {
      "Total Revenue": "Verify which field represents revenue or sales, and confirm its accounting definition (for example, gross or net revenue).",
      "Total Expenses": "Verify which field represents expenses or costs, and confirm its accounting definition and included expense categories.",
      "Net Profit": "Verify both revenue and expense fields and confirm they use the same accounting scope and reporting period before subtracting.",
      "Expense Ratio": "Verify both expense and revenue fields and their accounting definitions. Confirm the revenue denominator is valid and non-zero for the selected context."
    };
    if (explanations[name]) return explanations[name];
  }

  if (domain === "Sales") {
    const explanations = {
      "Total Sales": "Verify the sales/revenue field and confirm its business definition, including the treatment of returns, discounts, and taxes.",
      "Total Profit": hasProfit
        ? "Verify that the supplied profit field matches the business definition and order-line grain. If deriving profit instead, confirm Cost is matching total cost at that same grain before using SalesAmount minus Cost."
        : `Verify SalesAmount and Cost. Use SalesAmount minus Cost only if the business confirms Cost is the matching total cost at the same order-line grain.${!hasSales || !hasCost ? " Confirm that both fields are present in the intended table." : ""}`,
      "Profit Margin": hasProfit
        ? "Verify the profit and sales/revenue definitions and use a valid sales denominator; DIVIDE safely handles a zero denominator."
        : "Verify SalesAmount and Cost, and confirm Cost is matching total cost at the same order-line grain before calculating profit. Then calculate margin with DIVIDE([Total Profit], [Total Sales]); DIVIDE safely handles a zero denominator, but confirm the sales denominator is valid.",
      "Sales Growth": `Verify a sales/revenue field and a date field, then confirm the periods being compared are complete and comparable.${!hasSales || !hasDate ? " Confirm that both fields are present in the intended model." : ""}`,
      "Average Order Value": `Verify a sales/revenue field and a stable order identifier. Confirm orders are counted distinctly and the sales amount is attributed at the correct order grain.${!hasSales || !hasOrder ? " Confirm the needed fields are present in the intended model." : ""}`
    };
    if (explanations[name]) return explanations[name];
  }

  const explanations = {
    "Total Employees": "Verify the employee identifier or headcount field and define whether this is a current snapshot or a count over time.",
    "Attrition Rate": "Verify departure records and the headcount denominator, then agree how average headcount and the reporting period are calculated.",
    "Average Salary": "Verify the salary field, currency, employee inclusion rules, and whether the average should be weighted.",
    "Department-wise Headcount": "Verify the employee identifier and department field, including how transfers and duplicate employee records are handled.",
    "Campaign Conversion Rate": "Verify the conversion and eligible lead, visit, or response fields; agree what counts as a conversion and the denominator.",
    "Cost per Lead": "Verify campaign spend and qualified lead fields, and agree the lead qualification rule and reporting scope.",
    "Return on Ad Spend": "Verify attributed revenue and ad spend fields, attribution rules, and that both cover the same campaigns and period.",
    "Patient Volume": "Verify the patient or encounter identifier and decide whether the count should represent unique patients or visits.",
    "Average Length of Stay": "Verify admission and discharge dates or a validated duration field, and define which completed stays are included.",
    "Appointment Attendance Rate": "Verify scheduled appointments and attendance status fields, and define how cancellations and no-shows are treated.",
    "Student Enrollment": "Verify the student identifier and enrollment status, and define the term and statuses included.",
    "Course Completion Rate": "Verify course, completion, and eligible enrollment fields, and define which enrollments belong in the denominator.",
    "Average Assessment Score": "Verify the score field and assessment identifier, and confirm the grading scale and attempt-inclusion rules."
  };
  return explanations[name] || "Verify the relevant source field(s), business definition, and any required calculation rules or relationships before using this KPI.";
}

function getKpiRecommendations(domain, columnText) {
  const columns = splitNames(columnText);
  const recommendations = DOMAIN_KPIS[domain] || [
    { name: "Domain-specific outcome", description: "Define an outcome measure that directly reflects the stated business objective.", requiredGroups: [] },
    { name: "Operational volume", description: "Consider a count or volume measure if the dataset contains a stable entity or event identifier.", requiredGroups: [] }
  ];
  return recommendations.map((kpi) => {
    const groups = kpi.requiredGroups;
    let matched = groups.flatMap((group) => availableColumns(columns, group));
    let missingRequirements = groups.filter((group) => !fieldMatches(columns, group)).map((group) => group.join("/"));
    let requiredFields = groups.length ? groups.map((group) => group.join("/")).join(" AND ") : "Define a domain-appropriate field from the supplied schema";
    let calculation = "";
    if (domain === "Sales") {
      const salesColumn = findSalesColumn(columns);
      const profitColumn = findProfitColumn(columns);
      const costColumn = findCostColumn(columns);
      const orderColumn = findOrderColumn(columns);
      const salesDateColumn = findDateColumn(columns);
      const confirmedFields = {
        "Total Sales": { fields: [salesColumn], required: [[salesColumn, "sales/revenue field"]] },
        "Total Profit": {
          fields: profitColumn ? [profitColumn] : [salesColumn, costColumn],
          required: profitColumn ? [[profitColumn, "profit field"]] : [[salesColumn, "SalesAmount/sales field"], [costColumn, "Cost field"]],
          calculation: profitColumn ? `SUM(${profitColumn})` : salesColumn && costColumn ? `SUM(${salesColumn}) - SUM(${costColumn})` : "[Verified profit field or confirmed SalesAmount - Cost]"
        },
        "Profit Margin": {
          fields: profitColumn ? [profitColumn, salesColumn] : [salesColumn, costColumn],
          required: profitColumn ? [[profitColumn, "profit field"], [salesColumn, "sales/revenue field"]] : [[salesColumn, "SalesAmount/sales field"], [costColumn, "Cost field"]],
          calculation: "DIVIDE([Total Profit], [Total Sales])"
        },
        "Sales Growth": { fields: [salesColumn, salesDateColumn], required: [[salesColumn, "sales/revenue field"], [salesDateColumn, "date field"]] },
        "Average Order Value": { fields: [salesColumn, orderColumn], required: [[salesColumn, "sales/revenue field"], [orderColumn, "order identifier"]] }
      }[kpi.name] || { fields: [], required: [] };
      matched = confirmedFields.fields.filter(Boolean);
      missingRequirements = confirmedFields.required.filter(([column]) => !column).map(([, label]) => label);
      calculation = confirmedFields.calculation || "";
      if (kpi.name === "Total Profit" || kpi.name === "Profit Margin") {
        requiredFields = kpi.name === "Profit Margin"
          ? profitColumn
            ? "verified profit field and verified sales/revenue field"
            : "SalesAmount and matching Cost at the same order-line grain"
          : profitColumn
            ? "verified profit field"
            : "SalesAmount and Cost at the same order-line grain";
      } else if (kpi.name === "Total Sales") {
        requiredFields = "verified sales/revenue field";
      }
    }
    const uniqueMatched = [...new Set(matched)];
    const definitionUnverified = domain === "Sales";
    const conditional = groups.length === 0 || missingRequirements.length > 0 || definitionUnverified;
    const conditionalReason = conditional ? getConditionalKpiExplanation(domain, kpi.name, columns) : "";
    return {
      name: kpi.name,
      description: kpi.name === "Total Profit" && !findProfitColumn(columns)
        ? "Use SalesAmount minus Cost only after confirming Cost is the matching total cost at the same order-line grain."
        : kpi.description,
      requiredFields,
      matchedFields: uniqueMatched,
      conditional,
      conditionalReason,
      calculation
    };
  });
}

function getChartRecommendations(objective, columnText, period, domain) {
  const columns = splitNames(columnText);
  const isSales = domain === "Sales";
  const dateColumn = columns.find((column) => /date|time|month|year|period/i.test(column));
  const categoryColumn = columns.find((column) => /category|product|region|department|campaign|segment|team|course/i.test(column));
  const numericColumn = isSales ? findSalesColumn(columns) || columns.find(isNumericColumn) : columns.find(isNumericColumn);
  const objectiveText = normalizeText(objective).toLowerCase();
  const charts = [];
  const isTrendObjective = /trend|over time|growth|monthly|year|period|season/.test(objectiveText);
  const isProductComparison = /product|top|performance|compare|comparison|rank/.test(objectiveText);
  if (isSales && isTrendObjective) {
    const salesColumn = findSalesColumn(columns);
    const salesDateColumn = findDateColumn(columns);
    charts.push({
      type: "Line chart",
      question: "How do sales trends change over time?",
      fields: `${salesDateColumn || "[Date column — required]"} on the X-axis; ${salesColumn || "[Sales/revenue field — required]"} on the Y-axis`,
      reason: "Shows sales trends over time so changes and direction can be compared across the selected period.",
      conditional: !salesDateColumn || !salesColumn,
      conditionalNote: !salesDateColumn || !salesColumn
        ? `Conditional — recommend this visual only after confirming ${[!salesDateColumn && "a date field", !salesColumn && "a sales/revenue field"].filter(Boolean).join(" and ")} in the supplied schema.`
        : ""
    });
  } else if (!isSales && isTrendObjective) {
    charts.push({ type: "Line chart", question: "How does the selected measure change over time?", fields: `${dateColumn || "[Date/period column]"} on the X-axis; ${numericColumn || "[numeric measure]"} on the Y-axis`, reason: `A line chart makes direction and changes across ${period || "time"} easy to compare.` });
  }
  if (isSales && isProductComparison) {
    const productColumn = findProductColumn(columns);
    const salesColumn = findSalesColumn(columns);
    const productName = productColumn && normalizeColumnName(productColumn);
    const availabilityNotes = [];
    if (!productColumn || !salesColumn) {
      availabilityNotes.push(`Conditional — confirm ${[!productColumn && "Product or a verified related product-name field", !salesColumn && "a sales/revenue field"].filter(Boolean).join(" and ")} before recommending this visual.`);
    }
    if (productName === "product") {
      availabilityNotes.push("Conditional — confirm Product contains readable product labels; otherwise use a verified related product-name field.");
    } else if (productName === "productname") {
      availabilityNotes.push("Conditional — verify this product-name field is related to the sales rows before use.");
    }
    charts.push({
      type: "Bar chart",
      question: "Which products are the top performers by sales?",
      fields: `${productColumn || "[Product or verified related product-name field]"} as category; ${salesColumn || "[Sales/revenue field — required]"} as value`,
      reason: "Ranks product sales clearly so top-performing products can be identified.",
      conditional: !productColumn || !salesColumn || productName === "product" || productName === "productname",
      conditionalNote: availabilityNotes.join(" ")
    });
  } else if (!isSales && /compare|comparison|category|product|region|department|rank|top|performance/.test(objectiveText)) {
    charts.push({ type: "Bar chart", question: "Which categories have the highest or lowest values?", fields: `${categoryColumn || "[category column]"} as category; ${numericColumn || "[numeric measure]"} as value`, reason: "Bar lengths support quick ranking and comparison across categories." });
  }
  if (!isSales && /share|proportion|mix|composition|distribution/.test(objectiveText)) {
    charts.push({ type: "Donut chart (small category count only)", question: "How is the whole divided among a few meaningful categories?", fields: `${categoryColumn || "[category column]"} as legend; ${numericColumn || "[numeric measure]"} as value`, reason: "A donut can show part-to-whole relationships when there are only a few categories; use a bar chart for many." });
  }
  if (!isSales && /\b(?:relationship|correlat\w*|associated|versus|vs\.?)\b/.test(objectiveText)) {
    const numericColumns = columns.filter(isNumericColumn);
    charts.push({ type: "Scatter chart", question: "Do two numeric measures move together or show outliers?", fields: `${numericColumns[0] || "[numeric measure 1]"} on X-axis; ${numericColumns[1] || "[numeric measure 2]"} on Y-axis`, reason: "A scatter chart reveals relationships, clusters, and outliers when two valid numeric measures are available." });
  }
  if (!isSales && !charts.some((chart) => chart.type.startsWith("Bar")) && !charts.some((chart) => chart.type.startsWith("Donut"))) {
    charts.push({ type: "Bar chart", question: "Which available categories are highest or lowest for the chosen measure?", fields: `${categoryColumn || "[category column]"} as category; ${numericColumn || "[numeric measure]"} as value`, reason: "A bar chart is a readable baseline for comparing categories; replace placeholders only with verified fields." });
  }
  if (isSales) {
    const kpis = getKpiRecommendations(domain, columnText);
    const salesKpi = kpis.find((kpi) => kpi.name === "Total Sales");
    const profitKpi = kpis.find((kpi) => kpi.name === "Total Profit");
    const marginKpi = kpis.find((kpi) => kpi.name === "Profit Margin");
    const salesColumn = findSalesColumn(columns);
    charts.push(
      {
        type: "KPI card — Total Sales",
        question: "What is total sales for the selected filters and period?",
        fields: salesColumn || "[Verified sales/revenue field — required]",
        reason: "A dedicated card makes the sales headline value immediately visible.",
        conditional: salesKpi.conditional,
        conditionalNote: salesKpi.conditionalReason
      },
      {
        type: "KPI card — Total Profit",
        question: "What is total profit for the selected filters and period?",
        fields: profitKpi.calculation || "[Verified profit field or confirmed SalesAmount - Cost calculation]",
        reason: "A separate card distinguishes profit from sales; SalesAmount minus Cost is valid only when Cost is confirmed as matching total cost at the same order-line grain.",
        conditional: profitKpi.conditional,
        conditionalNote: profitKpi.conditionalReason
      },
      {
        type: "KPI card — Profit Margin",
        question: "What proportion of sales is profit?",
        fields: "DIVIDE([Total Profit], [Total Sales])",
        reason: "A separate percentage card shows profitability relative to sales; DIVIDE safely handles a zero denominator.",
        conditional: marginKpi.conditional,
        conditionalNote: marginKpi.conditionalReason || "Conditional — confirm both measures and their business definitions before use."
      }
    );
  } else {
    charts.push({ type: "Card visual", question: "What is the current value of a key, well-defined KPI?", fields: numericColumn || "[validated KPI measure]", reason: "A card gives the audience a quick headline value; include a clear label and comparison context where available." });
  }
  if (dateColumn) {
    charts.push({ type: "Matrix", question: "How do detailed values compare across two useful dimensions?", fields: `${categoryColumn || "[category/dimension]"} in rows; ${dateColumn} or [second dimension] in columns; ${numericColumn || "[measure]"} in values`, reason: "A matrix supports detailed cross-tab comparisons; avoid overcrowding it with too many dimensions." });
  }
  return charts;
}

function getDaxGuidance(columnText, tableText) {
  const columns = splitNames(columnText);
  const tables = splitNames(tableText);
  const table = tables[0] || "[TableName]";
  const salesColumn = findSalesColumn(columns);
  const profitColumn = findProfitColumn(columns);
  const costColumn = findCostColumn(columns);
  const dateColumn = findDateColumn(columns);
  const escaped = (name) => `'${name.replace(/'/g, "''")}'`;
  const quotedColumn = (name) => `[${name.replace(/]/g, "]]")}]`;
  const salesField = salesColumn ? `${escaped(table)}${quotedColumn(salesColumn)}` : "'[TableName]'[SalesAmount]";
  const profitField = profitColumn ? `${escaped(table)}${quotedColumn(profitColumn)}` : "'[TableName]'[ProfitAmount]";
  const profitFormula = profitColumn
    ? `Total Profit = SUM(${profitField})`
    : salesColumn && costColumn
      ? `Total Profit = SUM(${escaped(table)}${quotedColumn(salesColumn)}) - SUM(${escaped(table)}${quotedColumn(costColumn)})`
      : `Total Profit = SUM(${profitField})`;
  const profitExplanation = profitColumn
    ? "Aggregates a supplied profit field; verify its business definition."
    : "Use a verified profit field or derive sales less cost only after matching-grain semantics are confirmed.";
  const profitNote = !profitColumn
    ? `CONDITIONAL template only: use SalesAmount minus Cost only if the business confirms Cost is the matching total cost at the same order-line grain.${salesColumn && costColumn ? "" : " Required SalesAmount and/or Cost fields must also be confirmed."} Verify actual names, data types, relationships, and assumptions before use.`
    : "Template only. Verify actual table and column names, data types, relationships, filter behavior, and business assumptions before use.";
  const dateField = dateColumn ? `${escaped(table)}${quotedColumn(dateColumn)}` : "'[Calendar]'[Date]";
  const templates = [
    { name: "Total Sales", formula: `Total Sales = SUM(${salesField})`, explanation: "Aggregates a sales or revenue amount column. Confirm the business definition and aggregation grain." },
    { name: "Total Profit", formula: profitFormula, explanation: profitExplanation, note: profitNote },
    { name: "Profit Margin", formula: "Profit Margin = DIVIDE([Total Profit], [Total Sales])", explanation: "Uses DIVIDE to handle a zero denominator; format as a percentage and validate both base measures." },
    { name: "Year-to-Date Sales", formula: `Sales YTD = TOTALYTD([Total Sales], ${dateField})`, explanation: "Requires a continuous, marked date table and a valid relationship to the fact table; confirm fiscal-year rules." }
  ];
  return templates.map((template) => ({
    ...template,
    readyToExecute: false,
    note: template.note || "Template only. Verify actual table and column names, data types, relationships, filter behavior, and business assumptions before use."
  }));
}

function formatList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatKpis(kpis) {
  return kpis.map((kpi) => `- ${kpi.name}: ${kpi.description} Required fields: ${kpi.requiredFields}.${kpi.calculation ? ` Calculation: ${kpi.calculation}.` : ""} ${kpi.conditional ? `CONDITIONAL — ${kpi.conditionalReason || "confirm the required fields and business definition before proposing a calculation."}` : `Potentially supported by: ${kpi.matchedFields.join(", ")}; validate the field meaning first.`}`).join("\n");
}

function formatCharts(charts) {
  return charts.map((chart) => `- ${chart.type}${chart.conditional ? " (CONDITIONAL)" : ""}\n  Business question: ${chart.question}\n  Suggested fields: ${chart.fields}\n  Reason: ${chart.reason}${chart.conditionalNote ? `\n  Availability: ${chart.conditionalNote}` : ""}`).join("\n");
}

function formatDax(templates) {
  return templates.map((template) => `- ${template.name}: ${template.formula}\n  Explanation: ${template.explanation}\n  Validation: ${template.note}`).join("\n");
}

function buildFewShotExample() {
  return [
    "Example of the expected recommendation shape:",
    "KPI: Net Revenue",
    "Definition: Sum of net revenue for the selected period.",
    "Required fields: a verified revenue amount and a date field for period comparisons.",
    "Visual: Line chart — answers how revenue changes over time; date on the X-axis and verified revenue measure on the Y-axis.",
    "Caveat: Do not calculate until the source fields and revenue definition are confirmed."
  ].join("\n");
}

function buildDashboardPrompt(input) {
  const technique = TECHNIQUES[input.technique] || TECHNIQUES["zero-shot"];
  const domain = input.domain === "Custom" ? normalizeText(input.customDomain) || "Custom domain (not specified)" : normalizeText(input.domain) || "Not specified";
  const tables = splitNames(input.tableNames);
  const columns = splitNames(input.columns);
  const kpis = getKpiRecommendations(domain, input.columns);
  const charts = getChartRecommendations(input.objective, input.columns, input.period, domain);
  const dax = getDaxGuidance(input.columns, input.tableNames);
  const outputGuidance = OUTPUT_GUIDANCE[input.outputType] || OUTPUT_GUIDANCE["Complete dashboard blueprint"];
  const role = input.technique === "role-based"
    ? technique.instruction
    : "Use appropriate Power BI and data-analysis expertise to produce a practical, evidence-aware dashboard plan.";
  const sections = [
    "You are helping plan a Power BI dashboard. Generate the requested planning deliverable; do not claim to inspect, connect to, or execute against the user's actual data.",
    `Selected prompting technique: ${technique.label}. ${technique.explanation}`,
    `\n1. AI ROLE AND EXPERTISE\n${role}`,
    `\n2. BUSINESS CONTEXT\n- Project: ${normalizeText(input.projectName)}\n- Business domain: ${domain}\n- Target audience: ${normalizeText(input.audience)}\n- Dashboard complexity: ${normalizeText(input.complexity) || "Beginner"}\n- Preferred analysis period: ${normalizeText(input.period) || "Not specified"}\n- Desired output: ${normalizeText(input.outputType) || "Complete dashboard blueprint"}\n- Output focus: ${outputGuidance}`,
    `\n3. DATASET DETAILS\n- Description: ${normalizeText(input.datasetDescription)}\n- Tables: ${tables.length ? tables.join(", ") : "Not provided; ask the user to confirm table names."}\n- Supplied table/column names: ${columns.length ? columns.join(", ") : "Not provided; request the schema before making field-level recommendations."}`,
    `\n4. ANALYSIS OBJECTIVES\n${normalizeText(input.objective)}`,
    `\n5. RECOMMENDED KPIs\n${formatKpis(kpis)}`,
    `\n6. SUGGESTED POWER BI VISUALS\n${formatCharts(charts)}`,
    `\n7. SUGGESTED SLICERS AND FILTERS\nRecommend only fields confirmed in the supplied schema. Consider a date/period slicer if a valid date field exists, plus relevant category or organizational filters from the listed columns. Name the actual columns or explicitly mark each as a placeholder.`,
    `\n8. DATA CLEANING AND MODELING CONSIDERATIONS\nCheck data types, duplicates, missing values, inconsistent categories, date completeness, currency/unit consistency, grain, keys, and relationship cardinality. Do not assume a cleaning issue exists; describe checks and ask for clarification when needed.`,
    `\n9. DAX MEASURES TO CONSIDER\n${formatDax(dax)}`,
    `\n10. DASHBOARD LAYOUT SUGGESTIONS\nPropose a page structure suitable for a ${normalizeText(input.audience)} audience and ${normalizeText(input.complexity).toLowerCase() || "beginner"} complexity. Explain the reading order, KPI placement, trend/comparison area, filters, and drill-through or detail page only where useful.`,
    `\n11. EXPECTED OUTPUT FORMAT\n${technique.instruction}\n${input.technique === "few-shot" ? `\n${buildFewShotExample()}\n` : ""}Return a concise, clearly headed ${normalizeText(input.outputType).toLowerCase() || "complete dashboard blueprint"} for "${normalizeText(input.projectName)}". Include the business question, recommendation, fields required, and caveats for each proposed KPI or visual.`,
    `\n12. CONSTRAINTS TO PREVENT UNSUPPORTED ASSUMPTIONS\n- Use only the context and schema supplied above. Never invent tables, columns, values, business rules, relationships, or data-quality findings.\n- Treat every recommended KPI as conditional unless all required fields and calculation definitions are verified.\n- If a field is absent or ambiguous, label it as a placeholder or ask a clarifying question instead of implying it exists.\n- DAX snippets are unvalidated templates, not executable measures. Confirm names, data types, relationships, filter context, and business definitions before use.\n- Distinguish known facts from recommendations; explain material assumptions and avoid implying that you have accessed the dataset.\n- Keep recommendations appropriate for the stated audience, objective, and complexity.`
  ];
  return { prompt: sections.join("\n"), technique: technique.label, techniqueExplanation: technique.explanation, kpis, charts, dax };
}

export {
  buildDashboardPrompt,
  getChartRecommendations,
  getDaxGuidance,
  getKpiRecommendations,
  TECHNIQUES
};
