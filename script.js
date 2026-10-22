const STORAGE_KEY = "jobtrack-applications-v1";
const statuses = ["Applied", "Interview", "Offer", "Rejected"];
const $ = (id) => document.getElementById(id);

const demoApplications = [
  { id: "demo-1", company: "Infosys", title: "Junior Data Analyst", date: daysAgo(2), status: "Interview", link: "https://www.infosys.com/careers/" },
  { id: "demo-2", company: "Accenture", title: "AI/ML Associate", date: daysAgo(4), status: "Applied", link: "https://www.accenture.com/in-en/careers" },
  { id: "demo-3", company: "IBM", title: "Data Analyst", date: daysAgo(7), status: "Offer", link: "https://www.ibm.com/careers" },
  { id: "demo-4", company: "Cognizant", title: "Process Executive", date: daysAgo(9), status: "Rejected", link: "https://careers.cognizant.com/" },
  { id: "demo-5", company: "Cisco", title: "Software Engineer Trainee", date: daysAgo(12), status: "Applied", link: "https://jobs.cisco.com/" }
];
let applications = [];
let showAll = true;
let toastTimeout;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}
function setSaveStatus(saved) {
  const indicator = $("savedIndicator");
  indicator.classList.toggle("error", !saved);
  indicator.lastChild.textContent = saved ? " Saved in this browser" : " Not saved";
}
function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function loadApplications() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Saved data is not a list");
      applications = parsed.filter(isValidApplication);
    } else {
      applications = demoApplications.map(item => ({ ...item }));
      saveApplications();
    }
  } catch (error) {
    console.error("Could not load saved applications:", error);
    applications = demoApplications.map(item => ({ ...item }));
    setSaveStatus(false);
    showToast("Saved data could not be read. Demo data loaded instead.", true);
  }
}
function isValidApplication(item) {
  return item && typeof item.id === "string" &&
    typeof item.company === "string" && typeof item.title === "string" &&
    typeof item.date === "string" && statuses.includes(item.status) &&
    typeof item.link === "string";
}
function saveApplications() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    setSaveStatus(true);
    return true;
  } catch (error) {
    console.error("Could not save applications:", error);
    setSaveStatus(false);
    showToast("Could not save data. Check your browser storage settings.", true);
    return false;
  }
}
function formatDate(dateString) {
  if (!dateString) return "—";
  const parts = dateString.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateString;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(parts[0], parts[1] - 1, parts[2]));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
function initials(company) {
  return company.trim().split(/\s+/).slice(0, 2).map(word => word[0] || "").join("").toUpperCase();
}
function safeURL(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}
function renderStats() {
  $("totalCount").textContent = applications.length;
  $("interviewCount").textContent = applications.filter(a => a.status === "Interview").length;
  $("offerCount").textContent = applications.filter(a => a.status === "Offer").length;
  $("rejectedCount").textContent = applications.filter(a => a.status === "Rejected").length;
}
function getVisibleApplications() {
  const query = $("searchInput").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const sort = $("sortFilter").value;
  let list = applications.filter(app => {
    const matchesText = `${app.company} ${app.title}`.toLowerCase().includes(query);
    const matchesStatus = status === "All" || app.status === status;
    return matchesText && matchesStatus;
  });
  list.sort((a, b) => {
    if (sort === "oldest") return a.date.localeCompare(b.date);
    if (sort === "company") return a.company.localeCompare(b.company);
    return b.date.localeCompare(a.date);
  });
  if (!showAll) list = list.slice(0, 4);
  return list;
}
function renderApplications() {
  renderStats();
  const list = getVisibleApplications();
  const body = $("applicationsBody");
  body.innerHTML = "";
  list.forEach((app, index) => {
    const tr = document.createElement("tr");
    const url = safeURL(app.link);
    const colorClass = `color-${index % 5}`;
    tr.innerHTML = `
      <td><div class="company-cell">
        <div class="company-logo ${colorClass}">${escapeHTML(initials(app.company))}</div>
        <div><div class="company-name">${escapeHTML(app.company)}</div><div class="job-title">${escapeHTML(app.title)}</div></div>
      </div></td>
      <td>${escapeHTML(formatDate(app.date))}</td>
      <td><span class="status-pill status-${escapeHTML(app.status)}">${escapeHTML(app.status)}</span></td>
      <td>${url ? `<a class="job-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Open link ↗</a>` : '<span class="no-link">Not added</span>'}</td>
      <td><div class="row-actions">
        <button class="action-btn" type="button" data-action="edit" data-id="${escapeHTML(app.id)}" aria-label="Edit ${escapeHTML(app.company)}" title="Edit">✎</button>
        <button class="action-btn delete" type="button" data-action="delete" data-id="${escapeHTML(app.id)}" aria-label="Delete ${escapeHTML(app.company)}" title="Delete">⌫</button>
      </div></td>`;
    body.appendChild(tr);
  });
  $("emptyState").classList.toggle("hidden", list.length > 0);
  $("applicationsBody").classList.toggle("hidden", list.length === 0);
  $("resultsCount").textContent = `Showing ${list.length} of ${applications.length} application${applications.length === 1 ? "" : "s"}`;
  $("viewAllBtn").classList.toggle("hidden", !showAll || applications.length <= 4);
  $("viewAllBtn").innerHTML = showAll ? 'View less <span>↑</span>' : 'View all <span>→</span>';
}
function openModal(app = null) {
  $("jobForm").reset();
  clearErrors();
  $("jobId").value = app ? app.id : "";
  $("modalTitle").textContent = app ? "Edit application" : "Add application";
  $("saveJobBtn").innerHTML = app ? "Save changes <span>→</span>" : "Save application <span>→</span>";
  $("companyInput").value = app ? app.company : "";
  $("titleInput").value = app ? app.title : "";
  $("dateInput").value = app ? app.date : localDateString(new Date());
  $("statusInput").value = app ? app.status : "Applied";
  $("linkInput").value = app ? app.link : "";
  $("modalBackdrop").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("companyInput").focus(), 30);
}
function closeModal() {
  $("modalBackdrop").classList.add("hidden");
  document.body.style.overflow = "";
  $("jobForm").reset();
  clearErrors();
}
function clearErrors() {
  ["companyError", "titleError", "dateError", "linkError"].forEach(id => $(id).textContent = "");
}
function setError(id, message) { $(id).textContent = message; }
function validateForm() {
  clearErrors();
  let valid = true;
  const company = $("companyInput").value.trim();
  const title = $("titleInput").value.trim();
  const date = $("dateInput").value;
  const link = $("linkInput").value.trim();
  if (!company) { setError("companyError", "Please enter the company name."); valid = false; }
  if (!title) { setError("titleError", "Please enter the job title."); valid = false; }
  if (!date) { setError("dateError", "Please choose the application date."); valid = false; }
  else if (date > localDateString(new Date())) { setError("dateError", "Date cannot be in the future."); valid = false; }
  if (link && !safeURL(link)) { setError("linkError", "Enter a valid link beginning with https:// or http://."); valid = false; }
  return valid;
}
function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;
  const id = $("jobId").value;
  const previousApplications = applications;
  const updatedApplications = applications.slice();
  const existingIndex = updatedApplications.findIndex(app => app.id === id);
  const item = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    company: $("companyInput").value.trim(),
    title: $("titleInput").value.trim(),
    date: $("dateInput").value,
    status: $("statusInput").value,
    link: $("linkInput").value.trim()
  };
  if (existingIndex >= 0) {
    updatedApplications[existingIndex] = item;
  } else {
    updatedApplications.unshift(item);
  }
  applications = updatedApplications;
  if (!saveApplications()) {
    applications = previousApplications;
    renderApplications();
    return;
  }
  closeModal();
  showAll = true;
  renderApplications();
  showToast(existingIndex >= 0 ? "Application updated successfully." : "Application added successfully.");
}
function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const app = applications.find(item => item.id === button.dataset.id);
  if (!app) return;
  if (button.dataset.action === "edit") {
    openModal(app);
  } else if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Delete the application for ${app.company} — ${app.title}?`);
    if (!confirmed) return;
    const previousApplications = applications;
    applications = applications.filter(item => item.id !== app.id);
    if (!saveApplications()) {
      applications = previousApplications;
      renderApplications();
      return;
    }
    renderApplications();
    showToast("Application deleted.");
  }
}
function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 3200);
}
function setActiveNav(which) {
  $("navDashboard").classList.toggle("active", which === "dashboard");
  $("navApplications").classList.toggle("active", which === "applications");
  $("pageTitle").textContent = which === "dashboard" ? "Dashboard" : "Applications";
  if (which === "applications") {
    $("applicationsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    $("searchInput").focus({ preventScroll: true });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
function init() {
  $("todayLabel").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
  loadApplications();
  renderApplications();

  ["addJobTop", "emptyAddBtn"].forEach(id => $(id).addEventListener("click", () => openModal()));
  $("closeModalBtn").addEventListener("click", closeModal);
  $("cancelBtn").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", event => {
    if (event.target === $("modalBackdrop")) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("modalBackdrop").classList.contains("hidden")) closeModal();
  });
  $("jobForm").addEventListener("submit", handleSubmit);
  $("applicationsBody").addEventListener("click", handleTableAction);
  $("searchInput").addEventListener("input", renderApplications);
  $("statusFilter").addEventListener("change", renderApplications);
  $("sortFilter").addEventListener("change", renderApplications);
  $("viewAllBtn").addEventListener("click", () => { showAll = !showAll; renderApplications(); });
  $("navDashboard").addEventListener("click", () => setActiveNav("dashboard"));
  $("navApplications").addEventListener("click", () => setActiveNav("applications"));
}
document.addEventListener("DOMContentLoaded", init);
