import { buildDashboardPrompt, TECHNIQUES } from "./promptGenerator.js";
import { clearHistory, deleteHistoryItem, readHistory, saveHistoryItem } from "./storage.js";

const form = document.querySelector("#dashboard-form");
const promptEmpty = document.querySelector("#promptEmpty");
const generatedContent = document.querySelector("#generatedContent");
const generatedPrompt = document.querySelector("#generatedPrompt");
const statusMessage = document.querySelector("#statusMessage");
const recommendations = document.querySelector("#recommendations");
const historyList = document.querySelector("#historyList");
const historyCount = document.querySelector("#historyCount");
const toggleHistoryButton = document.querySelector("#toggleHistoryButton");
let currentResult = null;
let currentFormData = null;
let statusTimer = null;

const samples = {
  sales: {
    projectName: "Sales Performance Dashboard",
    domain: "Sales",
    datasetDescription: "An order-level export with one row per order line, including transaction date, product, region, quantity, sales amount, and cost. Historical data covers three years.",
    tableNames: "Orders, Products, Calendar",
    columns: "Orders: OrderDate, OrderID, Product, Category, Region, Quantity, SalesAmount, Cost",
    audience: "Manager",
    objective: "Compare sales and profit trends by month, region, and product category to identify areas needing attention.",
    period: "Monthly, last 3 years",
    complexity: "Intermediate",
    technique: "few-shot",
    outputType: "Complete dashboard blueprint"
  },
  hr: {
    projectName: "HR Analytics Dashboard",
    domain: "HR",
    datasetDescription: "An employee snapshot and movement dataset with employee identifier, department, location, hire date, employment status, termination date, and salary band. Do not expose personal employee details.",
    tableNames: "Employees, Departments, Calendar",
    columns: "Employees: EmployeeID, Department, Location, HireDate, EmploymentStatus, TerminationDate, SalaryBand",
    audience: "Executive",
    objective: "Understand headcount distribution and workforce attrition patterns by department and quarter.",
    period: "Quarterly, last 2 years",
    complexity: "Intermediate",
    technique: "role-based",
    outputType: "Dashboard plan"
  },
  finance: {
    projectName: "Financial Performance Dashboard",
    domain: "Finance",
    datasetDescription: "A monthly general-ledger summary with account, department, posting date, actual amount, budget amount, and currency. Amount signs and account groupings require finance-team validation.",
    tableNames: "Ledger, Accounts, Calendar",
    columns: "Ledger: PostingDate, Account, Department, ActualAmount, BudgetAmount, Currency",
    audience: "Business Owner",
    objective: "Compare actuals with budget by month and department, and surface material variances for review.",
    period: "Monthly, current fiscal year",
    complexity: "Advanced",
    technique: "zero-shot",
    outputType: "Complete dashboard blueprint"
  }
};

const fieldNames = ["projectName", "domain", "customDomain", "datasetDescription", "tableNames", "columns", "audience", "objective", "period", "complexity", "technique", "outputType"];

function collectFormData() {
  return Object.fromEntries(fieldNames.map((name) => [name, form.elements.namedItem(name).value.trim()]));
}

function setFormData(data) {
  fieldNames.forEach((name) => {
    const control = form.elements.namedItem(name);
    if (control && Object.hasOwn(data, name)) control.value = data[name];
  });
  updateCustomDomain();
  updateTechniqueNote();
}

function updateCustomDomain() {
  const isCustom = form.elements.domain.value === "Custom";
  document.querySelector("#customDomainField").hidden = !isCustom;
  form.elements.customDomain.required = isCustom;
  if (!isCustom) {
    form.elements.customDomain.value = "";
    clearFieldError("customDomain");
  }
}

function updateTechniqueNote() {
  const technique = TECHNIQUES[form.elements.technique.value] || TECHNIQUES["zero-shot"];
  document.querySelector("#techniqueNote").innerHTML = `<strong>${technique.label}:</strong> ${technique.explanation}`;
}

function clearFieldError(name) {
  const control = form.elements.namedItem(name);
  const error = document.querySelector(`#${name}-error`);
  if (control) control.removeAttribute("aria-invalid");
  if (error) error.textContent = "";
}

function validateForm(data) {
  const required = ["projectName", "domain", "datasetDescription", "columns", "audience", "objective"];
  if (data.domain === "Custom") required.push("customDomain");
  let firstInvalid = null;
  required.forEach((name) => {
    const control = form.elements.namedItem(name);
    const error = document.querySelector(`#${name}-error`);
    const missing = !data[name];
    const invalid = name === "projectName" ? data[name].length < 3 : false;
    if (missing || invalid) {
      control.setAttribute("aria-invalid", "true");
      error.textContent = missing
        ? (name === "columns" ? "Add the table and column names you know. Use placeholders only when the schema is genuinely unavailable." : "This field is required.")
        : "Enter at least 3 characters.";
      firstInvalid ||= control;
    } else {
      clearFieldError(name);
    }
  });
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function showStatus(message, state = "success") {
  window.clearTimeout(statusTimer);
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
  statusTimer = window.setTimeout(() => {
    statusMessage.textContent = "";
    delete statusMessage.dataset.state;
  }, 6000);
}

function renderKpis(kpis) {
  const list = document.querySelector("#kpiList");
  list.replaceChildren(...kpis.map((kpi) => {
    const item = document.createElement("li");
    item.className = "kpi-card";
    const title = document.createElement("strong");
    title.textContent = kpi.name;
    const badge = document.createElement("span");
    badge.className = `availability${kpi.conditional ? " conditional" : ""}`;
    badge.textContent = kpi.conditional ? "Conditional" : "Fields listed";
    const description = document.createElement("p");
    description.textContent = kpi.description;
    const requirement = document.createElement("p");
    requirement.className = "kpi-requirement";
    requirement.textContent = `Needed: ${kpi.requiredFields}${kpi.matchedFields.length ? ` · Found: ${kpi.matchedFields.join(", ")}` : ""}`;
    item.append(title, badge, description, requirement);
    if (kpi.calculation) {
      const calculation = document.createElement("p");
      calculation.className = "kpi-requirement";
      calculation.textContent = `Calculation: ${kpi.calculation}`;
      item.append(calculation);
    }
    if (kpi.conditionalReason) {
      const caveat = document.createElement("p");
      caveat.className = "kpi-requirement";
      caveat.textContent = kpi.conditionalReason;
      item.append(caveat);
    }
    return item;
  }));
}

function renderCharts(charts) {
  const list = document.querySelector("#chartList");
  list.replaceChildren(...charts.map((chart) => {
    const card = document.createElement("article");
    card.className = "chart-card";
    const type = document.createElement("span");
    type.className = "chart-type";
    type.textContent = chart.type;
    const question = document.createElement("strong");
    question.textContent = chart.question;
    const fields = document.createElement("p");
    fields.textContent = `Suggested fields: ${chart.fields}`;
    const reason = document.createElement("p");
    reason.textContent = `Why: ${chart.reason}`;
    card.append(type, question, fields, reason);
    if (chart.conditionalNote) {
      const availability = document.createElement("p");
      availability.className = "chart-availability";
      availability.textContent = chart.conditionalNote;
      card.append(availability);
    }
    return card;
  }));
}

function renderDax(templates) {
  const list = document.querySelector("#daxList");
  list.replaceChildren(...templates.map((template) => {
    const card = document.createElement("article");
    card.className = "dax-card";
    const title = document.createElement("strong");
    title.textContent = template.name;
    const code = document.createElement("code");
    code.textContent = template.formula;
    const explanation = document.createElement("p");
    explanation.textContent = template.explanation;
    const caveat = document.createElement("p");
    caveat.textContent = template.note;
    card.append(title, code, explanation, caveat);
    return card;
  }));
}

function renderResult(data, result) {
  currentFormData = { ...data };
  currentResult = result;
  promptEmpty.hidden = true;
  generatedContent.hidden = false;
  recommendations.hidden = false;
  generatedPrompt.value = result.prompt;
  document.querySelector("#techniqueBadge").textContent = result.technique;
  document.querySelector("#generatedTitle").textContent = data.projectName;
  document.querySelector("#output-heading").textContent = "Your planning prompt";
  renderKpis(result.kpis);
  renderCharts(result.charts);
  renderDax(result.dax);
  generatedContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function generateFromForm() {
  const data = collectFormData();
  if (!validateForm(data)) {
    showStatus("Please fix the highlighted fields before generating a prompt.", "error");
    return false;
  }
  const result = buildDashboardPrompt(data);
  renderResult(data, result);
  showStatus("Your tailored prompt is ready. It has not been sent to an AI service.");
  return true;
}

function renderHistory() {
  const { items, error } = readHistory();
  historyCount.textContent = String(items.length);
  historyList.replaceChildren();
  if (error) showStatus(error, "error");
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = error ? "History is unavailable. Check browser storage settings and try again." : "No saved prompts yet. Generate a prompt and choose “Save prompt” to keep it here.";
    historyList.append(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const main = document.createElement("div");
    main.className = "history-item-main";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const date = document.createElement("span");
    date.textContent = new Date(item.savedAt).toLocaleString();
    main.append(name, date);
    const actions = document.createElement("div");
    actions.className = "history-item-actions";
    const reuse = document.createElement("button");
    reuse.type = "button";
    reuse.textContent = "Reuse";
    reuse.setAttribute("aria-label", `Reuse ${item.name}`);
    reuse.addEventListener("click", () => {
      setFormData(item.formData);
      if (generateFromForm()) {
        showStatus(`Loaded "${item.name}" from history. Generate it again or edit the details.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-history";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${item.name}`);
    remove.addEventListener("click", () => {
      const result = deleteHistoryItem(item.id);
      if (!result.ok) showStatus(result.error, "error");
      else showStatus(`Deleted "${item.name}" from history.`);
      renderHistory();
    });
    actions.append(reuse, remove);
    row.append(main, actions);
    historyList.append(row);
  });
  const footer = document.createElement("div");
  footer.className = "history-footer";
  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear all history";
  clearButton.addEventListener("click", () => {
    const result = clearHistory();
    if (!result.ok) showStatus(result.error, "error");
    else showStatus("Prompt history cleared.");
    renderHistory();
  });
  footer.append(clearButton);
  historyList.append(footer);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateFromForm();
});

form.addEventListener("input", (event) => {
  const name = event.target.name;
  if (name) clearFieldError(name);
});

form.elements.domain.addEventListener("change", updateCustomDomain);
form.elements.technique.addEventListener("change", updateTechniqueNote);

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    setFormData(samples[button.dataset.sample]);
    form.elements.projectName.focus();
    showStatus("Sample project loaded. Review or edit any details, then generate your prompt.");
  });
});

document.querySelector("#clearFormButton").addEventListener("click", () => {
  form.reset();
  fieldNames.forEach(clearFieldError);
  updateCustomDomain();
  updateTechniqueNote();
  currentResult = null;
  currentFormData = null;
  promptEmpty.hidden = false;
  generatedContent.hidden = true;
  recommendations.hidden = true;
  document.querySelector("#output-heading").textContent = "Ready when you are";
  showStatus("Form and generated prompt cleared. Saved history is unchanged.");
});

document.querySelector("#generateAgainButton").addEventListener("click", generateFromForm);

document.querySelector("#copyPromptButton").addEventListener("click", async () => {
  if (!currentResult) {
    showStatus("Generate a prompt before copying it.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(currentResult.prompt);
    showStatus("Prompt copied to the clipboard.");
  } catch {
    try {
      generatedPrompt.focus();
      generatedPrompt.select();
      const copied = document.execCommand("copy");
      if (copied) showStatus("Prompt copied to the clipboard.");
      else showStatus("Could not copy automatically. Select the prompt text and copy it manually.", "error");
    } catch {
      showStatus("Could not access the clipboard. Select the prompt text and copy it manually.", "error");
    }
  }
});

document.querySelector("#savePromptButton").addEventListener("click", () => {
  if (!currentResult || !currentFormData) {
    showStatus("Generate a prompt before saving it.", "error");
    return;
  }
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: currentFormData.projectName,
    prompt: currentResult.prompt,
    formData: currentFormData,
    savedAt: new Date().toISOString()
  };
  const result = saveHistoryItem(item);
  if (!result.ok) showStatus(result.error, "error");
  else {
    showStatus("Prompt saved in this browser.");
    renderHistory();
  }
});

document.querySelector("#downloadPromptButton").addEventListener("click", () => {
  if (!currentResult || !currentFormData) {
    showStatus("Generate a prompt before downloading it.", "error");
    return;
  }
  let url;
  try {
    const blob = new Blob([currentResult.prompt], { type: "text/plain;charset=utf-8" });
    url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentFormData.projectName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "dashboard-prompt"}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    showStatus("Prompt download started.");
  } catch (error) {
    showStatus(`Could not start the prompt download: ${error.message}`, "error");
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
});

toggleHistoryButton.addEventListener("click", () => {
  const opening = historyList.hidden;
  historyList.hidden = !opening;
  toggleHistoryButton.setAttribute("aria-expanded", String(opening));
  toggleHistoryButton.firstChild.textContent = opening ? "Hide history " : "View history ";
  if (opening) renderHistory();
});

updateCustomDomain();
updateTechniqueNote();
