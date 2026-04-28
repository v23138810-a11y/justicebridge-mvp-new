const questions = [
  {
    key: "issue",
    label: "What is your issue?",
    prompt: "Tell me the issue in 1-2 lines.",
    type: "textarea",
    placeholder: "Example: I received a damaged mixer and the seller is not replacing it."
  },
  {
    key: "company",
    label: "Company / seller name",
    prompt: "What is the company or seller name?",
    type: "text",
    placeholder: "Example: ABC Electronics"
  },
  {
    key: "amount",
    label: "Amount involved (\u20b9)",
    prompt: "How much money is involved?",
    type: "number",
    placeholder: "Example: 2499"
  },
  {
    key: "date",
    label: "Date of issue",
    prompt: "When did this issue happen?",
    type: "date",
    placeholder: ""
  },
  {
    key: "proofs",
    label: "Upload proof",
    prompt: "Upload proof like a bill, screenshot, receipt, email, or chat.",
    type: "file",
    placeholder: ""
  }
];

const CASES_KEY = "justicebridge_cases_v1";

const state = {
  index: 0,
  answers: {},
  latestComplaint: "",
  latestEscalation: "",
  latestCaseId: ""
};

const screens = {
  home: document.querySelector("#homeScreen"),
  complaint: document.querySelector("#complaintScreen"),
  output: document.querySelector("#outputScreen"),
  document: document.querySelector("#documentScreen"),
  rti: document.querySelector("#rtiScreen"),
  rights: document.querySelector("#rightsScreen"),
  cases: document.querySelector("#casesScreen")
};

const titles = {
  home: "Not getting a response?",
  complaint: "File complaint",
  output: "Consumer complaint ready",
  document: "Explain my document",
  rti: "Create RTI application",
  rights: "Know your rights",
  cases: "My cases"
};

const paths = {
  home: "/",
  complaint: "/complaint",
  document: "/document",
  rti: "/rti",
  rights: "/rights",
  cases: "/cases"
};

const routeNames = Object.fromEntries(Object.entries(paths).map(([name, route]) => [route, name]));
const navLinks = document.querySelectorAll(".bottom-nav [data-route]");
const pageTitle = document.querySelector("#pageTitle");
const questionPanel = document.querySelector("#questionPanel");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const answerForm = document.querySelector("#answerForm");
const answerSubmitButton = document.querySelector("#answerSubmitButton");
const inputMount = document.querySelector("#inputMount");
const complaintText = document.querySelector("#complaintText");
const complaintPreview = document.querySelector("#complaintPreview");
const complaintLoading = document.querySelector("#complaintLoading");
const escalationText = document.querySelector("#escalationText");
const escalationActions = document.querySelector("#escalationActions");
const documentForm = document.querySelector("#documentForm");
const rtiForm = document.querySelector("#rtiForm");
const rightsOutput = document.querySelector("#rightsOutput");
const casesList = document.querySelector("#casesList");
const documentSubmitButton = document.querySelector("#documentSubmitButton");
const rtiSubmitButton = document.querySelector("#rtiSubmitButton");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function routeFromPath(pathname) {
  return routeNames[pathname] || "home";
}

function setRoute(name, replace) {
  const path = paths[name] || "/";
  if (window.location.pathname === path) {
    return;
  }
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ screen: name }, "", path);
}

function setActiveNav(name) {
  const activeName = name === "output" ? "complaint" : name;
  navLinks.forEach((link) => {
    const isActive = link.dataset.route === activeName;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function showScreen(name, options = {}) {
  Object.values(screens).forEach((screen) => {
    screen.hidden = true;
  });
  screens[name].hidden = false;
  pageTitle.textContent = titles[name];
  setActiveNav(name);

  if (options.updateRoute !== false) {
    setRoute(name === "output" ? "complaint" : name, options.replace);
  }

  if (name === "cases") {
    renderCases();
  }

  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
}

function startComplaintFlow(options = {}) {
  state.index = 0;
  state.answers = {};
  state.latestComplaint = "";
  state.latestEscalation = "";
  state.latestCaseId = "";
  questionPanel.innerHTML = "";
  complaintText.value = "";
  complaintPreview.innerHTML = "";
  escalationText.value = "";
  escalationText.hidden = true;
  escalationActions.hidden = true;
  complaintLoading.hidden = true;
  showScreen("complaint", options);
  renderQuestion();
}

function handleRouteChange() {
  const route = routeFromPath(window.location.pathname);
  if (route === "complaint") {
    startComplaintFlow({ updateRoute: false });
    return;
  }
  showScreen(route, { updateRoute: false });
}

function renderQuestion() {
  const question = questions[state.index];
  const percent = Math.round(((state.index + 1) / questions.length) * 100);
  progressText.textContent = `Step ${state.index + 1} of ${questions.length}: ${question.label}`;
  progressBar.style.width = `${percent}%`;
  inputMount.innerHTML = "";
  questionPanel.innerHTML = "";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `Step ${state.index + 1} of ${questions.length}`;

  const heading = document.createElement("h3");
  heading.textContent = question.label;

  const prompt = document.createElement("p");
  prompt.textContent = question.prompt;

  questionPanel.appendChild(eyebrow);
  questionPanel.appendChild(heading);
  questionPanel.appendChild(prompt);

  answerSubmitButton.textContent = state.index === questions.length - 1 ? "Generate complaint" : "Continue";

  const field = document.createElement("div");
  field.className = "field";

  const label = document.createElement("label");
  label.setAttribute("for", "answerInput");
  label.textContent = question.label;
  field.appendChild(label);

  let input;
  if (question.type === "textarea") {
    input = document.createElement("textarea");
  } else {
    input = document.createElement("input");
    input.type = question.type;
  }

  input.id = "answerInput";
  input.name = question.key;
  input.placeholder = question.placeholder;
  input.required = question.key !== "proofs";

  if (question.type === "file") {
    input.multiple = true;
    input.accept = "image/*,.pdf,.doc,.docx";
    const help = document.createElement("p");
    help.className = "file-help";
    help.textContent = "Files stay on this device. Upload them again on the official portal.";
    field.appendChild(input);
    field.appendChild(help);
  } else {
    field.appendChild(input);
  }

  inputMount.appendChild(field);
  input.focus();
}

function getAnswer(question) {
  const input = document.querySelector("#answerInput");
  if (question.type === "file") {
    return Array.from(input.files || []).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
  }
  return input.value.trim();
}

function answerSummary(question, value) {
  if (question.type === "file") {
    if (!value.length) {
      return "I will attach proof later.";
    }
    return `${value.length} proof file(s): ${value.map((file) => file.name).join(", ")}`;
  }
  if (question.key === "amount") {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
  }
  return value;
}

async function generateDraft() {
  complaintLoading.hidden = false;
  setButtonBusy(answerSubmitButton, true, "Generating...");

  const fallbackComplaint = window.JusticeBridgeGenerator.generateComplaint(state.answers);
  const fallbackEscalation = window.JusticeBridgeGenerator.generateEscalation(state.answers);

  try {
    const response = await fetch("/api/complaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.answers)
    });
    if (!response.ok) {
      throw new Error("Server could not generate the draft");
    }
    const payload = await response.json();
    state.latestComplaint = payload.complaint || fallbackComplaint;
    state.latestEscalation = payload.escalation || fallbackEscalation;
  } catch (error) {
    state.latestComplaint = fallbackComplaint;
    state.latestEscalation = fallbackEscalation;
  } finally {
    complaintLoading.hidden = true;
    setButtonBusy(answerSubmitButton, false);
  }

  complaintText.value = state.latestComplaint;
  escalationText.value = state.latestEscalation;
  renderComplaintPreview(state.latestComplaint, complaintPreview);
  state.latestCaseId = saveComplaintCase("Waiting for response", "Drafted");
  showScreen("output");
}

answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questions[state.index];
  const value = getAnswer(question);

  if (question.required !== false && !value) {
    showToast("Please answer this question.");
    return;
  }

  state.answers[question.key] = value;
  state.index += 1;

  if (state.index >= questions.length) {
    await generateDraft();
    return;
  }

  renderQuestion();
});

document.querySelectorAll("[data-route]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = link.dataset.route;
    if (!screens[target]) {
      return;
    }
    event.preventDefault();
    if (target === "complaint") {
      startComplaintFlow();
      return;
    }
    showScreen(target);
  });
});

window.addEventListener("popstate", handleRouteChange);

document.querySelector("#copyButton").addEventListener("click", () => {
  copyText(state.latestComplaint || complaintText.value, "Complaint copied.");
});

document.querySelector("#pdfButton").addEventListener("click", () => {
  downloadPdf(state.latestComplaint || complaintText.value, "justicebridge-consumer-complaint.pdf");
});

document.querySelector("#markSubmittedButton").addEventListener("click", () => {
  updateCaseStatus(state.latestCaseId, "Waiting for response", "Submitted");
  showToast("Case marked as submitted.");
});

document.querySelector("#startOverButton").addEventListener("click", startComplaintFlow);

document.querySelector("#escalateButton").addEventListener("click", () => {
  escalationText.value = state.latestEscalation || window.JusticeBridgeGenerator.generateEscalation(state.answers);
  escalationText.hidden = false;
  escalationActions.hidden = false;
  updateCaseStatus(state.latestCaseId, "Escalation recommended", "Escalated");
  escalationText.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
});

document.querySelector("#copyEscalationButton").addEventListener("click", () => {
  copyText(escalationText.value, "Escalation copied.");
});

document.querySelector("#pdfEscalationButton").addEventListener("click", () => {
  downloadPdf(escalationText.value, "justicebridge-escalation-complaint.pdf");
});

documentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = document.querySelector("#documentFile").files[0];
  const question = document.querySelector("#documentQuestion").value.trim();

  if (!file) {
    showToast("Please upload a document.");
    return;
  }

  setButtonBusy(documentSubmitButton, true, "Reading...");

  try {
    const extractedText = await extractTextFromFile(file);
    const result = window.JusticeBridgeGenerator.explainDocument({
      fileName: file.name,
      question,
      extractedText
    });

    renderParagraphs(document.querySelector("#documentSummary"), result.summary);
    renderList(document.querySelector("#documentPoints"), result.keyPoints);
    renderList(document.querySelector("#documentNext"), result.nextSteps);
    document.querySelector("#documentOutput").hidden = false;
  } finally {
    setButtonBusy(documentSubmitButton, false);
  }
});

rtiForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setButtonBusy(rtiSubmitButton, true, "Generating...");
  try {
    const rti = window.JusticeBridgeGenerator.generateRtiApplication({
      information: document.querySelector("#rtiInformation").value,
      department: document.querySelector("#rtiDepartment").value,
      location: document.querySelector("#rtiLocation").value
    });

    document.querySelector("#rtiText").value = rti;
    renderDraftPreview(rti, document.querySelector("#rtiPreview"));
    document.querySelector("#rtiOutput").hidden = false;
    document.querySelector("#rtiOutput").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  } finally {
    setButtonBusy(rtiSubmitButton, false);
  }
});

document.querySelector("#copyRtiButton").addEventListener("click", () => {
  copyText(document.querySelector("#rtiText").value, "RTI copied.");
});

document.querySelector("#pdfRtiButton").addEventListener("click", () => {
  downloadPdf(document.querySelector("#rtiText").value, "justicebridge-rti-application.pdf");
});

document.querySelectorAll("[data-rights]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-rights]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const guide = window.JusticeBridgeGenerator.getRightsGuide(button.dataset.rights);
    renderList(document.querySelector("#rightsList"), guide.rights);
    renderList(document.querySelector("#rightsSteps"), guide.steps);
    renderList(document.querySelector("#rightsAvoid"), guide.avoid);
    rightsOutput.hidden = false;
    rightsOutput.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  });
});

function setButtonBusy(button, busy, label) {
  if (!button) {
    return;
  }
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label || "Working...";
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function extractTextFromFile(file) {
  const lowerName = file.name.toLowerCase();

  try {
    if (file.type.startsWith("text/") || lowerName.endsWith(".txt")) {
      return (await readFileAsText(file)).slice(0, 1400);
    }

    if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
      const buffer = await readFileAsArrayBuffer(file);
      const raw = new TextDecoder("utf-8").decode(buffer);
      const readableChunks = raw
        .replace(/[^\x20-\x7E\n\r]/g, " ")
        .match(/[A-Za-z0-9][A-Za-z0-9 ,.;:()/-]{20,}/g);
      return readableChunks ? readableChunks.slice(0, 8).join(" ").slice(0, 1400) : "";
    }
  } catch (error) {
    return "";
  }

  return "";
}

function renderParagraphs(mount, lines) {
  mount.innerHTML = "";
  lines.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    mount.appendChild(paragraph);
  });
}

function renderList(mount, items) {
  mount.innerHTML = "";
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    mount.appendChild(listItem);
  });
}

function renderComplaintPreview(text, mount) {
  mount.innerHTML = "";
  const sections = [
    {
      heading: "Subject",
      lines: extractComplaintSection(text, "3. Subject")
    },
    {
      heading: "Complainant details",
      lines: extractComplaintSection(text, "1. Complainant Details")
    },
    {
      heading: "Opposite party",
      lines: extractComplaintSection(text, "2. Opposite Party")
    },
    {
      heading: "Facts of the case",
      lines: extractComplaintSection(text, "4. Facts of the Case")
    },
    {
      heading: "Relief sought",
      lines: extractComplaintSection(text, "5. Relief Sought")
    },
    {
      heading: "Date",
      lines: extractDateLines(text)
    }
  ];

  sections.forEach((section) => {
    const card = document.createElement("article");
    card.className = "draft-section professional-document-section";

    const heading = document.createElement("h3");
    heading.textContent = section.heading;
    card.appendChild(heading);

    section.lines.forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      card.appendChild(paragraph);
    });

    mount.appendChild(card);
  });
}

function extractComplaintSection(text, heading) {
  const lines = text.split("\n").map((line) => line.trim());
  const start = lines.findIndex((line) => line === heading);
  if (start === -1) {
    return ["[Section not found]"];
  }

  const sectionLines = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    if (/^[1-9]\.\s/.test(line) || line === "Declaration") {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.length ? sectionLines : ["[Add details]"];
}

function extractDateLines(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Date:") || line.startsWith("Place:") || line.startsWith("Signature:"));
  return lines.length ? lines : ["Date: [Submission date]"];
}

function renderDraftPreview(text, mount) {
  mount.innerHTML = "";
  const sections = [];
  let current = { heading: "Draft", lines: [] };

  text.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    if (isDraftHeading(line)) {
      if (current.heading !== "Draft" || current.lines.length) {
        sections.push(current);
      }
      current = { heading: line, lines: [] };
      return;
    }

    current.lines.push(line);
  });

  if (current.heading !== "Draft" || current.lines.length) {
    sections.push(current);
  }

  sections.forEach((section) => {
    const card = document.createElement("article");
    card.className = "draft-section";

    const heading = document.createElement("h3");
    heading.textContent = section.heading;
    card.appendChild(heading);

    section.lines.forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      card.appendChild(paragraph);
    });

    mount.appendChild(card);
  });
}

function isDraftHeading(line) {
  return (
    /^[0-9]+\.\s/.test(line) ||
    /^[A-Z][A-Z /-]{4,45}$/.test(line) ||
    line === "Declaration" ||
    line === "Applicant Details" ||
    line === "To,"
  );
}

function loadCases() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CASES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveCases(cases) {
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
}

function saveComplaintCase(status, stage = "Drafted") {
  const cases = loadCases();
  const issue = String(state.answers.issue || "Consumer complaint").trim();
  const company = String(state.answers.company || "Company not added").trim();
  const id = `case-${Date.now()}`;
  cases.unshift({
    id,
    title: issue.length > 70 ? `${issue.slice(0, 67)}...` : issue,
    company,
    status,
    stage,
    createdAt: new Date().toISOString(),
    complaint: state.latestComplaint,
    escalation: state.latestEscalation
  });
  saveCases(cases.slice(0, 25));
  return id;
}

function updateCaseStatus(id, status, stage) {
  if (!id) {
    return;
  }

  const cases = loadCases();
  const nextCases = cases.map((item) => (
    item.id === id ? { ...item, status, stage: stage || stageFromStatus(status) } : item
  ));
  saveCases(nextCases);
}

function renderCases() {
  const cases = loadCases();
  casesList.innerHTML = "";

  if (!cases.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No local cases yet. File a consumer complaint to save your first draft.";
    casesList.appendChild(empty);
    return;
  }

  cases.forEach((rawItem) => {
    const item = normalizeCase(rawItem);
    const card = document.createElement("article");
    card.className = "case-card";

    const header = document.createElement("div");
    header.className = "case-header";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const chip = document.createElement("span");
    chip.className = `status-chip ${statusClass(item.status)}`;
    chip.textContent = item.status;

    const meta = document.createElement("div");
    meta.className = "case-meta";
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "Saved locally";
    meta.innerHTML = `<span>Company: ${escapeHtml(item.company)}</span><span>Saved: ${escapeHtml(date)}</span>`;

    const statusRow = document.createElement("div");
    statusRow.className = "status-row";

    const label = document.createElement("label");
    label.textContent = "Status";

    const select = document.createElement("select");
    ["Waiting for response", "Follow-up needed", "Escalation recommended"].forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = item.status === status;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      const nextStage = stageFromStatus(select.value);
      updateCaseStatus(item.id, select.value, nextStage);
      chip.textContent = select.value;
      chip.className = `status-chip ${statusClass(select.value)}`;
      renderCaseProgress(progress, nextStage);
      showToast("Case status updated.");
    });

    const progress = document.createElement("div");
    progress.className = "case-progress";
    renderCaseProgress(progress, item.stage);

    const copyButton = document.createElement("button");
    copyButton.className = "secondary-button";
    copyButton.type = "button";
    copyButton.textContent = "Copy complaint";
    copyButton.addEventListener("click", () => copyText(item.complaint || "", "Complaint copied."));

    statusRow.appendChild(label);
    statusRow.appendChild(select);
    header.appendChild(title);
    header.appendChild(chip);
    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(progress);
    card.appendChild(statusRow);
    card.appendChild(copyButton);
    casesList.appendChild(card);
  });
}

function statusClass(status) {
  return `status-${String(status || "Waiting for response").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function normalizeCase(item) {
  if (item.status === "Drafted") {
    return { ...item, status: "Waiting for response", stage: item.stage || "Drafted" };
  }
  if (item.status === "Submitted") {
    return { ...item, status: "Waiting for response", stage: item.stage || "Submitted" };
  }
  if (item.status === "Escalated") {
    return { ...item, status: "Escalation recommended", stage: item.stage || "Escalated" };
  }
  return {
    ...item,
    status: item.status || "Waiting for response",
    stage: item.stage || (item.status ? stageFromStatus(item.status) : "Drafted")
  };
}

function stageFromStatus(status) {
  if (status === "Follow-up needed") {
    return "Follow-up";
  }
  if (status === "Escalation recommended") {
    return "Escalated";
  }
  return "Submitted";
}

function renderCaseProgress(mount, stage) {
  const steps = ["Drafted", "Submitted", "Follow-up", "Escalated"];
  const activeIndex = Math.max(0, steps.indexOf(stage || "Drafted"));
  mount.innerHTML = "";
  steps.forEach((step, index) => {
    const item = document.createElement("span");
    item.className = index <= activeIndex ? "complete" : "";
    item.textContent = `${index + 1}. ${step}`;
    mount.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
    showToast(successMessage);
  }
}

function showToast(text) {
  const existing = document.querySelector(".toast");
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function wrapText(text, maxChars) {
  const lines = [];
  text.split("\n").forEach((line) => {
    if (!line.trim()) {
      lines.push("");
      return;
    }
    let current = "";
    line.split(/\s+/).forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    lines.push(current);
  });
  return lines;
}

function escapePdfText(text) {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function makePdf(text) {
  const lines = wrapText(text, 86);
  const linesPerPage = 48;
  const pages = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const pageRefs = [];
  const fontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  pages.forEach((pageLines) => {
    const stream = [
      "BT",
      "/F1 10 Tf",
      "50 790 Td",
      "13 TL",
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      "ET"
    ].join("\n");
    const streamRef = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageRef = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${streamRef} 0 R >>`);
    pageRefs.push(pageRef);
  });

  const pagesRef = addObject(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  const fixedObjects = objects.map((object) => object.replace("/Parent 0 0 R", `/Parent ${pagesRef} 0 R`));
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  fixedObjects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${fixedObjects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${fixedObjects.length + 1} /Root ${catalogRef} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function downloadPdf(text, filename) {
  const pdf = makePdf(text);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("PDF downloaded.");
}

handleRouteChange();
