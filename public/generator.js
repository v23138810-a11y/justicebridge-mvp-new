(function attachGenerator(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.JusticeBridgeGenerator = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : undefined, function createGenerator() {
  function text(value, fallback) {
    const cleaned = String(value || "").replace(/\s+/g, " ").trim();
    return cleaned || fallback;
  }

  function titleCase(value) {
    return text(value, "the opposite party")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      return "the amount paid";
    }
    return `Rs. ${Math.round(number).toLocaleString("en-IN")}`;
  }

  function formatDate(value) {
    if (!value) {
      return "[Date of issue]";
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return text(value, "[Date of issue]");
    }
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function proofLine(proofs) {
    const names = Array.isArray(proofs)
      ? proofs.map((proof) => text(proof && (proof.name || proof), "")).filter(Boolean)
      : [];
    if (!names.length) {
      return "Proof documents: [Attach bill, receipt, screenshot, chat, email, or other proof].";
    }
    return `Proof documents attached: ${names.join(", ")}.`;
  }

  function generateComplaint(input) {
    const issue = text(input && input.issue, "[Briefly describe the issue]");
    const company = titleCase(input && input.company);
    const amount = formatMoney(input && input.amount);
    const issueDate = formatDate(input && input.date);
    const proofs = proofLine(input && input.proofs);
    const subject = `Consumer complaint against ${company} for ${issue}`;

    return [
      "CONSUMER COMPLAINT",
      "",
      "1. Complainant Details",
      "Name: [Your full name]",
      "Address: [Your full address]",
      "Mobile: [Your mobile number]",
      "Email: [Your email address]",
      "",
      "2. Opposite Party",
      `Name of company / seller: ${company}`,
      "Address: [Company / seller address, if known]",
      "",
      "3. Subject",
      subject,
      "",
      "4. Facts of the Case",
      `I am a consumer of ${company}. On ${issueDate}, I faced the following issue: ${issue}.`,
      `The amount involved is ${amount}.`,
      "I contacted / tried to contact the company or seller, but my issue has not been solved to my satisfaction.",
      proofs,
      "",
      "5. Relief Sought",
      `I request ${company} to provide a refund of ${amount}, or a replacement if suitable.`,
      "I also request fair compensation for inconvenience, delay, and any loss caused to me.",
      "I request that the matter be resolved at the earliest.",
      "",
      "Declaration",
      "The facts stated above are true to the best of my knowledge.",
      "",
      "Place: [Your city]",
      "Date: [Submission date]",
      "Signature: [Your name]"
    ].join("\n");
  }

  function generateEscalation(input) {
    const issue = text(input && input.issue, "[Briefly describe the issue]");
    const company = titleCase(input && input.company);
    const amount = formatMoney(input && input.amount);
    const issueDate = formatDate(input && input.date);
    const proofs = proofLine(input && input.proofs);

    return [
      "FOLLOW-UP / ESCALATION REQUEST",
      "",
      "1. Complainant Details",
      "Name: [Your full name]",
      "Mobile: [Your mobile number]",
      "Email: [Your email address]",
      "",
      "2. Opposite Party",
      `Name of company / seller: ${company}`,
      "",
      "3. Reference",
      "Original grievance / docket number: [Enter docket number]",
      "Original submission date: [Enter submission date]",
      "",
      "4. Reason for Escalation",
      `I submitted a consumer complaint against ${company}. I have not received a proper response within 3 days.`,
      `The issue started on ${issueDate}. The issue is: ${issue}.`,
      `The amount involved is ${amount}.`,
      proofs,
      "",
      "5. Relief Requested",
      "I request urgent review of my grievance and quick action.",
      `I request a refund of ${amount}, or a replacement if suitable, along with fair compensation for inconvenience.`,
      "",
      "Declaration",
      "The facts stated above are true to the best of my knowledge.",
      "",
      "Date: [Escalation date]",
      "Signature: [Your name]"
    ].join("\n");
  }

  function toLines(value) {
    return text(value, "")
      .split(/\n|;|\./)
      .map((line) => text(line, ""))
      .filter(Boolean);
  }

  function generateRtiApplication(input) {
    const information = toLines(input && input.information);
    const department = text(input && input.department, "[Name of public authority / department]");
    const location = text(input && input.location, "[City / State]");
    const requestedLines = information.length
      ? information
      : ["[Write the information you want from the public authority]"];

    return [
      "RTI APPLICATION",
      "",
      "To,",
      "The Public Information Officer,",
      department,
      location,
      "",
      "Subject: Request for information under the Right to Information Act, 2005",
      "",
      "Sir / Madam,",
      "",
      "I request the following information under the Right to Information Act, 2005:",
      "",
      ...requestedLines.map((line, index) => `${index + 1}. ${line}`),
      "",
      "Please provide the information in simple and readable form.",
      "If the requested information is held by another public authority, please transfer this application as per the RTI process.",
      "",
      "Applicant Details",
      "Name: [Your full name]",
      "Address: [Your full address]",
      "Mobile: [Your mobile number]",
      "Email: [Your email address]",
      "",
      "Application fee: [Paid online / postal order details, if applicable]",
      "",
      "Place: [Your city]",
      "Date: [Submission date]",
      "Signature: [Your name]"
    ].join("\n");
  }

  function explainDocument(input) {
    const fileName = text(input && input.fileName, "the uploaded document");
    const question = text(input && input.question, "the main meaning of the document");
    const extractedText = text(input && input.extractedText, "");
    const lower = `${fileName} ${question} ${extractedText}`.toLowerCase();
    const points = [];

    if (lower.includes("invoice") || lower.includes("bill") || lower.includes("receipt")) {
      points.push("This document seems to show a payment, purchase, or amount due.");
      points.push("Check the seller name, date, amount, tax details, and item description.");
    }
    if (lower.includes("agreement") || lower.includes("contract")) {
      points.push("This document seems to list promises, duties, dates, and payment terms.");
      points.push("Look for start date, end date, notice period, fees, and penalties.");
    }
    if (lower.includes("notice") || lower.includes("demand")) {
      points.push("This document seems to ask for a response or action by a deadline.");
      points.push("Check the deadline, sender details, claim amount, and reason given.");
    }
    if (lower.includes("salary") || lower.includes("employer")) {
      points.push("This document may relate to work, salary, leave, or employer communication.");
      points.push("Check dates, amount, designation, and any promised payment.");
    }
    if (!points.length) {
      points.push("The file was received and a basic MVP review was created.");
      points.push("Check names, dates, amounts, deadlines, and the action asked from you.");
    }

    const preview = extractedText
      ? extractedText.slice(0, 180).replace(/\s+/g, " ")
      : "Text extraction is basic in this MVP, so the summary uses the file name and your question.";

    return {
      summary: [
        `You uploaded ${fileName}.`,
        `You want to understand: ${question}.`,
        preview
      ],
      keyPoints: points.slice(0, 4),
      nextSteps: [
        "Save a copy of this document and any related messages.",
        "Mark important dates, amounts, names, and deadlines.",
        "Ask the sender or company for clarification in writing if anything is unclear.",
        "Use official portals or trusted help when you are ready to take action."
      ]
    };
  }

  function getRightsGuide(category) {
    const guides = {
      consumer: {
        title: "Consumer Issue",
        rights: [
          "You can ask for a clear bill, receipt, or service record.",
          "You can request repair, replacement, refund, or a written response.",
          "You can use official consumer grievance channels for unresolved issues."
        ],
        steps: [
          "Collect bill, screenshots, chats, emails, and warranty papers.",
          "Write a short complaint to the seller or company.",
          "If there is no useful response, submit a grievance on the official portal."
        ],
        avoid: [
          "Do not delete proof.",
          "Do not make threats or use abusive language.",
          "Do not send original documents unless required."
        ]
      },
      police: {
        title: "Police Interaction",
        rights: [
          "You can ask why you are being called or questioned.",
          "You can keep family or a trusted person informed.",
          "You can ask for copies or acknowledgement where available."
        ],
        steps: [
          "Stay calm and note officer name, station, date, and time.",
          "Carry ID and keep copies of documents.",
          "Write down what happened soon after the interaction."
        ],
        avoid: [
          "Do not argue aggressively.",
          "Do not sign blank papers.",
          "Do not share false information."
        ]
      },
      tenant: {
        title: "Tenant Issue",
        rights: [
          "You can ask for rent receipts and a written agreement.",
          "You can ask for reasonable notice before major changes.",
          "You can keep proof of rent, deposit, repairs, and communication."
        ],
        steps: [
          "Collect rent proof, agreement, deposit receipt, and messages.",
          "Send requests or complaints in writing.",
          "Try to resolve the issue with clear records before escalating."
        ],
        avoid: [
          "Do not stop keeping payment records.",
          "Do not damage property.",
          "Do not rely only on phone calls for important issues."
        ]
      },
      salary: {
        title: "Salary / Employer Issue",
        rights: [
          "You can ask for salary slips, offer letter, and payment details.",
          "You can keep records of attendance, work, and messages.",
          "You can ask for dues to be explained in writing."
        ],
        steps: [
          "Collect offer letter, salary slips, bank entries, and chats.",
          "Send a polite written request for pending salary or documents.",
          "Keep a timeline of dates, amounts, and responses."
        ],
        avoid: [
          "Do not delete work or company data.",
          "Do not share confidential information publicly.",
          "Do not rely on verbal promises only."
        ]
      }
    };

    return guides[category] || guides.consumer;
  }

  return {
    generateComplaint,
    generateEscalation,
    generateRtiApplication,
    explainDocument,
    getRightsGuide
  };
});
