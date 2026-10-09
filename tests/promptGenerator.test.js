import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardPrompt, getChartRecommendations, getDaxGuidance, getKpiRecommendations } from "../js/promptGenerator.js";
import { clearHistory, deleteHistoryItem, HISTORY_KEY, MAX_HISTORY_ITEMS, readHistory, saveHistoryItem } from "../js/storage.js";

const validInput = {
  projectName: "Regional Sales Review",
  domain: "Sales",
  customDomain: "",
  datasetDescription: "Order-level sales and cost records for three years.",
  tableNames: "Orders, Calendar",
  columns: "OrderDate, OrderID, Region, SalesAmount, Cost",
  audience: "Manager",
  objective: "Compare monthly sales trends and regional performance.",
  period: "Monthly, last 3 years",
  complexity: "Intermediate",
  technique: "zero-shot",
  outputType: "Complete dashboard blueprint"
};

function createStorage(initialValue = null, shouldThrow = false) {
  let value = initialValue;
  return {
    getItem() {
      if (shouldThrow) throw new Error("Storage blocked");
      return value;
    },
    setItem(_key, nextValue) {
      if (shouldThrow) throw new Error("Storage blocked");
      value = nextValue;
    },
    value: () => value
  };
}

function historyItem(id = "one") {
  return { id, name: "Test dashboard", prompt: "A prompt", savedAt: "2026-01-01T00:00:00.000Z", formData: { projectName: "Test dashboard" } };
}

test("tailors prompt to the project, dataset, audience, and objective", () => {
  const result = buildDashboardPrompt(validInput);
  assert.match(result.prompt, /Regional Sales Review/);
  assert.match(result.prompt, /OrderDate, OrderID, Region, SalesAmount, Cost/);
  assert.match(result.prompt, /Target audience: Manager/);
  assert.match(result.prompt, /Compare monthly sales trends/);
});

test("zero-shot mode explains the technique without including a few-shot example", () => {
  const result = buildDashboardPrompt(validInput);
  assert.equal(result.technique, "Zero-shot");
  assert.match(result.prompt, /without examples/i);
  assert.doesNotMatch(result.prompt, /Example of the expected recommendation shape/);
});

test("few-shot mode includes a task-relevant answer structure", () => {
  const result = buildDashboardPrompt({ ...validInput, technique: "few-shot" });
  assert.equal(result.technique, "Few-shot");
  assert.match(result.prompt, /Example of the expected recommendation shape/);
  assert.match(result.prompt, /Required fields:/);
});

test("role-based mode specifies Power BI developer and analyst expertise", () => {
  const result = buildDashboardPrompt({ ...validInput, technique: "role-based" });
  assert.match(result.prompt, /Act as an experienced Power BI developer and data analyst/);
});

test("Sales KPI recommendations mark absent profit and order fields conditional", () => {
  const kpis = getKpiRecommendations("Sales", "SalesAmount, OrderDate");
  assert.equal(kpis.find((kpi) => kpi.name === "Total Sales").conditional, true);
  assert.equal(kpis.find((kpi) => kpi.name === "Total Profit").conditional, true);
  assert.match(kpis.find((kpi) => kpi.name === "Total Sales").conditionalReason, /Verify the sales\/revenue field.*business definition/i);
  assert.match(kpis.find((kpi) => kpi.name === "Total Profit").conditionalReason, /matching total cost at the same order-line grain/);
  assert.match(kpis.find((kpi) => kpi.name === "Profit Margin").conditionalReason, /DIVIDE safely handles a zero denominator/);
  assert.match(kpis.find((kpi) => kpi.name === "Sales Growth").conditionalReason, /periods being compared are complete and comparable/);
  assert.match(kpis.find((kpi) => kpi.name === "Average Order Value").conditionalReason, /counted distinctly/);
  assert.match(kpis.find((kpi) => kpi.name === "Average Order Value").requiredFields, /order/i);
});

test("generic amounts do not falsely establish sales or revenue availability", () => {
  const salesKpis = getKpiRecommendations("Sales", "ActualAmount");
  const financeKpis = getKpiRecommendations("Finance", "ActualAmount");
  assert.equal(salesKpis.find((kpi) => kpi.name === "Total Sales").conditional, true);
  assert.equal(financeKpis.find((kpi) => kpi.name === "Total Revenue").conditional, true);
});

test("Finance and HR domains produce domain-specific KPIs", () => {
  assert.ok(getKpiRecommendations("Finance", "ActualAmount").some((kpi) => kpi.name === "Expense Ratio"));
  assert.ok(getKpiRecommendations("HR", "EmployeeID, Department").some((kpi) => kpi.name === "Department-wise Headcount"));
});

test("conditional Finance KPIs explain the accounting checks in plain language", () => {
  const kpis = getKpiRecommendations("Finance", "LedgerAmount");
  const explanationFor = (name) => kpis.find((kpi) => kpi.name === name).conditionalReason;
  assert.match(explanationFor("Total Revenue"), /revenue\/sales field.*business definition/i);
  assert.match(explanationFor("Total Expenses"), /expense\/cost field.*accounting definition/i);
  assert.match(explanationFor("Net Profit"), /revenue and expense fields.*same accounting scope/i);
  assert.match(explanationFor("Expense Ratio"), /expense and revenue fields.*valid and non-zero/i);
  assert.ok(kpis.every((kpi) => !kpi.conditional || kpi.conditionalReason.length > 0));
});

test("every conditional KPI has a verification explanation without falsely claiming missing data", () => {
  const domains = ["Sales", "Finance", "HR", "Marketing", "Healthcare", "Education", "Custom"];
  for (const domain of domains) {
    const kpis = getKpiRecommendations(domain, "ExampleColumn");
    for (const kpi of kpis.filter((recommendation) => recommendation.conditional)) {
      assert.ok(kpi.conditionalReason.length > 0, `${domain} / ${kpi.name} needs an explanation`);
      assert.doesNotMatch(kpi.conditionalReason, /\bmissing\b|\bnot found\b/i);
      assert.match(kpi.conditionalReason, /verify|confirm|define|decide|agree/i);
    }
  }
});

test("unknown custom domains receive cautious, objective-led KPI ideas", () => {
  const kpis = getKpiRecommendations("Supply chain", "ShipmentId, DelayDays");
  assert.equal(kpis.length, 2);
  assert.ok(kpis.every((kpi) => kpi.conditional));
});

test("chart guidance responds to trend, comparison, and proportion objectives", () => {
  const charts = getChartRecommendations("Compare category sales over time and show the share by region", "OrderDate, Region, SalesAmount", "monthly");
  assert.ok(charts.some((chart) => chart.type === "Line chart"));
  assert.ok(charts.some((chart) => chart.type === "Bar chart"));
  assert.ok(charts.some((chart) => chart.type.startsWith("Donut chart")));
});

test("Sales charts prefer OrderDate, SalesAmount, and ProductName when supplied", () => {
  const charts = getChartRecommendations(
    "Compare sales and profit trends by month and identify top-performing products.",
    "Orders: OrderDate, Quantity, SalesAmount, ProfitAmount, ProductName, ProductID",
    "monthly",
    "Sales"
  );
  const line = charts.find((chart) => chart.type === "Line chart");
  const bar = charts.find((chart) => chart.type === "Bar chart");
  assert.match(line.fields, /^OrderDate on the X-axis; SalesAmount on the Y-axis$/);
  assert.match(line.reason, /sales trends over time/i);
  assert.equal(line.conditional, false);
  assert.match(bar.fields, /^ProductName as category; SalesAmount as value$/);
  assert.equal(bar.conditional, true);
  assert.match(bar.conditionalNote, /verify this product-name field is related/);
  assert.deepEqual(charts.filter((chart) => chart.type.startsWith("KPI card")).map((chart) => chart.type), [
    "KPI card — Total Sales",
    "KPI card — Total Profit",
    "KPI card — Profit Margin"
  ]);
  assert.equal(charts.find((chart) => chart.type.endsWith("Profit Margin")).fields, "DIVIDE([Total Profit], [Total Sales])");
});

test("Sales charts use conditional placeholders when required fields are absent", () => {
  const charts = getChartRecommendations("Review sales trends and top-performing products.", "ProductID, Quantity", "", "Sales");
  const line = charts.find((chart) => chart.type === "Line chart");
  const bar = charts.find((chart) => chart.type === "Bar chart");
  assert.equal(line.conditional, true);
  assert.match(line.fields, /\[Date column — required\]/);
  assert.match(line.fields, /\[Sales\/revenue field — required\]/);
  assert.match(line.conditionalNote, /recommend this visual only after confirming/);
  assert.equal(bar.conditional, true);
  assert.match(bar.fields, /^\[Product or verified related product-name field\] as category; \[Sales\/revenue field — required\] as value$/);
  assert.match(bar.conditionalNote, /Product or a verified related product-name field/);
  assert.ok(charts.filter((chart) => chart.type.startsWith("KPI card")).every((chart) => chart.conditional));
});

test("Sales product chart uses Product and advises using readable related labels", () => {
  const charts = getChartRecommendations("Show top-performing products.", "ProductID, SalesAmount", "", "Sales");
  const bar = charts.find((chart) => chart.type === "Bar chart");
  assert.match(bar.fields, /^\[Product or verified related product-name field\] as category; SalesAmount as value$/);
  assert.equal(bar.conditional, true);
  assert.match(bar.conditionalNote, /Product or a verified related product-name field/);
});

test("Sales Product category is preferred and must contain readable labels", () => {
  const charts = getChartRecommendations("Rank top products by sales.", "Product, ProductName, SalesAmount", "", "Sales");
  const bar = charts.find((chart) => chart.type === "Bar chart");
  assert.match(bar.fields, /^Product as category; SalesAmount as value$/);
  assert.equal(bar.conditional, true);
  assert.match(bar.conditionalNote, /confirm Product contains readable product labels/);
});

test("Total Profit may use SalesAmount minus Cost only conditionally at matching order-line grain", () => {
  const kpis = getKpiRecommendations("Sales", "OrderDate, SalesAmount, Cost");
  const profit = kpis.find((kpi) => kpi.name === "Total Profit");
  const margin = kpis.find((kpi) => kpi.name === "Profit Margin");
  assert.equal(profit.conditional, true);
  assert.equal(profit.calculation, "SUM(SalesAmount) - SUM(Cost)");
  assert.match(profit.conditionalReason, /matching total cost at the same order-line grain/);
  assert.equal(margin.calculation, "DIVIDE([Total Profit], [Total Sales])");
  assert.equal(margin.conditional, true);
  const daxProfit = getDaxGuidance("SalesAmount, Cost", "Orders").find((template) => template.name === "Total Profit");
  assert.match(daxProfit.formula, /SUM\('Orders'\[SalesAmount\]\) - SUM\('Orders'\[Cost\]\)/);
  assert.match(daxProfit.note, /matching total cost at the same order-line grain/);
  const missingCostProfit = getKpiRecommendations("Sales", "SalesAmount").find((kpi) => kpi.name === "Total Profit");
  assert.equal(missingCostProfit.conditional, true);
  assert.match(missingCostProfit.conditionalReason, /matching total cost at the same order-line grain/);
  assert.match(missingCostProfit.conditionalReason, /Verify SalesAmount and Cost/);
});

test("Total Profit DAX uses a supplied profit field when available", () => {
  const profit = getDaxGuidance("SalesAmount, Cost, ProfitAmount", "Orders").find((template) => template.name === "Total Profit");
  assert.match(profit.formula, /SUM\('Orders'\[ProfitAmount\]\)/);
  assert.doesNotMatch(profit.note, /matching total cost at the same order-line grain/);
});

test("generated Sales prompt includes conditional chart and separate KPI-card guidance", () => {
  const result = buildDashboardPrompt({
    ...validInput,
    projectName: "Sales Performance Dashboard",
    domain: "Sales",
    objective: "Compare sales trends by month and identify top-performing products.",
    columns: "Orders: OrderDate, SalesAmount, Cost, Product"
  });
  assert.match(result.prompt, /OrderDate on the X-axis; SalesAmount on the Y-axis/);
  assert.match(result.prompt, /Product as category; SalesAmount as value/);
  assert.match(result.prompt, /Product should contain readable product labels/);
  assert.match(result.prompt, /KPI card — Total Sales/);
  assert.match(result.prompt, /KPI card — Total Profit/);
  assert.match(result.prompt, /KPI card — Profit Margin/);
  assert.match(result.prompt, /SUM\(SalesAmount\) - SUM\(Cost\)/);
  assert.match(result.prompt, /DIVIDE\(\[Total Profit\], \[Total Sales\]\)/);
  assert.match(result.prompt, /matching total cost at the same order-line grain/);
  const profitTemplate = result.dax.find((template) => template.name === "Total Profit");
  assert.match(profitTemplate.formula, /SUM\('Orders'\[SalesAmount\]\) - SUM\('Orders'\[Cost\]\)/);
  assert.match(profitTemplate.note, /CONDITIONAL template only/);
});

test("charts use placeholders rather than inventing absent schema fields", () => {
  const charts = getChartRecommendations("Compare category performance", "Metric", "");
  assert.ok(charts.some((chart) => chart.fields.includes("[category column]")));
});

test("chart field detection does not mistake Account for a numeric count measure", () => {
  const charts = getChartRecommendations("Compare department performance", "Account, Department, ActualAmount", "");
  assert.ok(charts.some((chart) => chart.fields.includes("ActualAmount as value")));
  assert.ok(charts.every((chart) => !chart.fields.includes("Account as value")));
});

test("DAX guidance uses supplied names when available and is never execution-ready", () => {
  const templates = getDaxGuidance("PostingDate, RevenueAmount, Profit", "Ledger");
  assert.match(templates[0].formula, /'Ledger'\[RevenueAmount\]/);
  assert.match(templates[3].formula, /'Ledger'\[PostingDate\]/);
  assert.ok(templates.every((template) => !template.readyToExecute));
});

test("table prefixes in schema input are removed before resolving column names", () => {
  const templates = getDaxGuidance("Orders: OrderDate, SalesAmount", "Orders");
  assert.match(templates[0].formula, /'Orders'\[SalesAmount\]/);
  assert.match(templates[3].formula, /'Orders'\[OrderDate\]/);
  assert.doesNotMatch(templates[3].formula, /Orders: OrderDate/);
});

test("DAX guidance retains explicit placeholders for unknown fields", () => {
  const templates = getDaxGuidance("Metric", "");
  assert.match(templates[0].formula, /\[TableName\]\[SalesAmount\]/);
  assert.match(templates[3].formula, /\[Calendar\]\[Date\]/);
});

test("missing dataset fields are identified rather than silently assumed", () => {
  const result = buildDashboardPrompt({ ...validInput, tableNames: "", columns: "" });
  assert.match(result.prompt, /Not provided; ask the user to confirm table names/);
  assert.match(result.prompt, /request the schema before making field-level recommendations/);
});

test("empty history and invalid JSON are handled without throwing", () => {
  assert.deepEqual(readHistory(createStorage()).items, []);
  const invalid = readHistory(createStorage("{not-json"));
  assert.deepEqual(invalid.items, []);
  assert.match(invalid.error, /Could not read prompt history/);
});

test("malformed history entries are skipped and reported", () => {
  const storage = createStorage(JSON.stringify([historyItem(), { id: 3, prompt: false }]));
  const result = readHistory(storage);
  assert.equal(result.items.length, 1);
  assert.match(result.error, /invalid saved prompts were skipped/);
});

test("save, reuse, delete, and clear history work with browser-like storage", () => {
  const storage = createStorage();
  const saved = saveHistoryItem(historyItem(), storage);
  assert.equal(saved.ok, true);
  assert.equal(readHistory(storage).items[0].prompt, "A prompt");
  assert.equal(deleteHistoryItem("one", storage).items.length, 0);
  saveHistoryItem(historyItem("two"), storage);
  assert.equal(clearHistory(storage).ok, true);
  assert.deepEqual(readHistory(storage).items, []);
});

test("history remains capped at the newest ten saved prompts", () => {
  const storage = createStorage();
  for (let index = 0; index < MAX_HISTORY_ITEMS + 2; index += 1) {
    saveHistoryItem(historyItem(String(index)), storage);
  }
  const items = readHistory(storage).items;
  assert.equal(items.length, MAX_HISTORY_ITEMS);
  assert.equal(items[0].id, "11");
});

test("storage exceptions are reported to the caller", () => {
  assert.match(readHistory(createStorage(null, true)).error, /Storage blocked/);
  assert.equal(saveHistoryItem(historyItem(), createStorage(null, true)).ok, false);
});
