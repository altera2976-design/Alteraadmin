/**
 * offerLetterPdf.ts
 * Dedicated PDF generator and share/download service for Altera Interior Offer Letters.
 * Formatted with official company branding, logo, terms & conditions, salary structure, and signatures.
 */

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { COMPANY_LOGO_DATA_URL } from "../constants/companyLogo";

export interface OfferLetterData {
  offerLetterNumber?: string;
  offerLetterDate?: string;
  createdAt?: string;
  joiningDate?: string;
  candidateName: string;
  fatherGuardianName?: string;
  email?: string;
  mobile?: string;
  address?: string;
  designation: string;
  department: string;
  workLocation?: string;
  probationPeriod?: string;
  noticePeriod?: string;
  reportingManager?: string;
  employmentType?: string;
  monthlySalary: number;
  annualCTC: number;
  greetingText?: string;
  offerParagraph?: string;
  salaryPaymentCycle?: string;
  rulesAndRegulations?: Array<{ ruleNumber?: number; title: string; description: string }>;
  status?: string;
  candidateSignature?: string;
  acceptedAt?: string;
}

export function formatINR(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  return "₹" + Math.round(Number(val)).toLocaleString("en-IN");
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export const DEFAULT_OFFER_RULES = [
  {
    ruleNumber: 1,
    title: "Client Communication & Personal Contact",
    description: "Employees must not share or use personal mobile numbers, personal email IDs or private social-media accounts for direct client communication without written authorization. All official client communication must be made through official channels.",
  },
  {
    ruleNumber: 2,
    title: "No Personal Work During Office Hours",
    description: "During working hours, employees must devote their full time and attention to company activities. Freelance or external business activities are strictly prohibited.",
  },
  {
    ruleNumber: 3,
    title: "Confidentiality & Data Protection",
    description: "All client information, quotations, 3D designs, vendor details, pricing formulas, and internal documents must be kept strictly confidential.",
  },
  {
    ruleNumber: 4,
    title: "Client & Company Property",
    description: "Company devices, samples, key sets, project drawings, and files must be handled responsibly and returned immediately upon request or separation.",
  },
  {
    ruleNumber: 5,
    title: "Professional Conduct & Punctuality",
    description: "Employees must maintain professional behavior, punctuality, and respectful conduct with clients, managers, colleagues, and contractors at all times.",
  },
  {
    ruleNumber: 6,
    title: "Attendance & Leave Policy",
    description: "Employees are expected to report on time and register attendance using the company app. Planned leave must be pre-approved.",
  },
  {
    ruleNumber: 7,
    title: "Notice Period",
    description: "An employee intending to resign must provide at least 15 to 30 days prior written notice as stipulated in employment terms.",
  },
  {
    ruleNumber: 8,
    title: "Conflict of Interest",
    description: "Employees must not engage in any activity or business that competes with Altera Interior or creates a conflict of interest.",
  },
];

export function buildOfferLetterHtml(offer: OfferLetterData): string {
  const offerNum = offer.offerLetterNumber || "OL-2026-0001";
  const offerDate = formatDate(offer.offerLetterDate || offer.createdAt || new Date().toISOString());
  const joiningDateStr = formatDate(offer.joiningDate || new Date().toISOString());
  const candidateName = offer.candidateName || "Candidate";
  const designation = offer.designation || "Interior Designer";
  const department = offer.department || "Design & Execution";
  const workLoc = offer.workLocation || "Gurugram, Haryana";
  const probation = offer.probationPeriod || "3 Months";
  const notice = offer.noticePeriod || "30 Days";
  const manager = offer.reportingManager || "Management / HR";
  const empType = offer.employmentType || "Full Time";
  const monthlySalaryStr = formatINR(offer.monthlySalary);
  const annualCtcStr = formatINR(offer.annualCTC || offer.monthlySalary * 12);
  const greetingText = offer.greetingText || `Dear ${candidateName},`;
  const offerParagraph =
    offer.offerParagraph ||
    `We are pleased to offer you the position of ${designation} in the ${department} department at Altera Interior. We were very impressed with your background and skills.`;
  const payCycle =
    offer.salaryPaymentCycle ||
    "Salary will be credited on or before the 10th of every month via direct bank transfer, subject to attendance and company policy.";

  const rulesList =
    Array.isArray(offer.rulesAndRegulations) && offer.rulesAndRegulations.length > 0
      ? offer.rulesAndRegulations
      : DEFAULT_OFFER_RULES;

  const rulesHtml = rulesList
    .map((r, idx) => {
      const num = r.ruleNumber || idx + 1;
      return `
        <div class="rule-item">
          <div class="rule-title">${num}. ${r.title}</div>
          <div class="rule-desc">${r.description}</div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Offer_Letter_${offerNum}_${candidateName.replace(/\s+/g, "_")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1E293B;
      background: #FFFFFF;
      padding: 24px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #7A131A;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      color: #7A131A;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-sub {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .candidate-to {
      margin-bottom: 16px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .candidate-name {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
      margin: 2px 0;
    }
    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 11.5px;
    }
    .terms-table td {
      padding: 7px 10px;
      border: 1px solid #E2E8F0;
    }
    .terms-table tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .label-cell {
      font-weight: 700;
      color: #475569;
      width: 40%;
    }
    .val-cell {
      font-weight: 700;
      color: #0F172A;
    }
    .section-heading {
      font-size: 12px;
      font-weight: 800;
      color: #7A131A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 20px;
      margin-bottom: 8px;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .rule-item {
      margin-bottom: 8px;
    }
    .rule-title {
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
    }
    .rule-desc {
      font-size: 10.5px;
      color: #475569;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #CBD5E1;
    }
    .sig-box {
      width: 45%;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
    }
    .sig-sub {
      font-size: 10px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <img src="${COMPANY_LOGO_DATA_URL}" alt="Altera Interior Logo" style="height: 52px; width: auto; max-width: 280px; object-fit: contain; display: block;" />
    </div>
    <div class="doc-meta">
      <div class="doc-title">OFFER OF EMPLOYMENT</div>
      <div class="doc-sub">Ref: <strong>${offerNum}</strong></div>
      <div class="doc-sub">Date: ${offerDate}</div>
    </div>
  </div>

  <div class="candidate-to">
    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Offer Letter Issued To</div>
    <div class="candidate-name">${candidateName}</div>
    <div style="font-size: 11.5px; color: #475569;">
      ${offer.fatherGuardianName ? `S/o or D/o: ${offer.fatherGuardianName} • ` : ""}${offer.email || ""} ${offer.mobile ? `| ${offer.mobile}` : ""}
    </div>
    ${offer.address ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">Address: ${offer.address}</div>` : ""}
  </div>

  <p style="margin-top: 12px; font-weight: 700;">${greetingText}</p>
  <p style="margin-top: 4px; color: #334155;">${offerParagraph}</p>

  <div class="section-heading">Summary of Employment Terms</div>
  <table class="terms-table">
    <tbody>
      <tr>
        <td class="label-cell">Designation / Role</td>
        <td class="val-cell">${designation}</td>
      </tr>
      <tr>
        <td class="label-cell">Department</td>
        <td class="val-cell">${department}</td>
      </tr>
      <tr>
        <td class="label-cell">Expected Date of Joining</td>
        <td class="val-cell" style="color: #7A131A;">${joiningDateStr}</td>
      </tr>
      <tr>
        <td class="label-cell">Employment Type</td>
        <td class="val-cell">${empType}</td>
      </tr>
      <tr>
        <td class="label-cell">Monthly Gross Salary</td>
        <td class="val-cell">${monthlySalaryStr} / month</td>
      </tr>
      <tr>
        <td class="label-cell">Annual Total CTC Package</td>
        <td class="val-cell" style="color: #2563EB; font-weight: 800;">${annualCtcStr} / annum</td>
      </tr>
      <tr>
        <td class="label-cell">Work Location</td>
        <td class="val-cell">${workLoc}</td>
      </tr>
      <tr>
        <td class="label-cell">Reporting Manager</td>
        <td class="val-cell">${manager}</td>
      </tr>
      <tr>
        <td class="label-cell">Probation &amp; Notice Period</td>
        <td class="val-cell">Probation: ${probation} • Notice: ${notice}</td>
      </tr>
    </tbody>
  </table>

  <div style="font-size: 11px; color: #475569; background: #F8FAFC; padding: 8px 12px; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 14px;">
    <strong>Salary Disbursement Policy:</strong> ${payCycle}
  </div>

  <div class="section-heading">Company Operational Terms &amp; Guidelines</div>
  ${rulesHtml}

  <p style="margin-top: 14px; font-size: 11.5px; font-weight: 600; color: #1E293B;">
    We welcome you to the Altera Interior team and look forward to creating extraordinary interior spaces together!
  </p>

  <div class="signatures-row">
    <div class="sig-box">
      <div style="height: 36px; border-bottom: 1px solid #0F172A; width: 140px; margin-bottom: 4px;"></div>
      <div class="sig-title">Authorized Signatory</div>
      <div class="sig-sub">Altera Interior HR &amp; Management Team</div>
    </div>
    <div class="sig-box" style="text-align: right;">
      <div style="height: 36px; border-bottom: 1px solid #0F172A; width: 140px; margin-left: auto; margin-bottom: 4px;"></div>
      <div class="sig-title">Candidate Acceptance Signature</div>
      <div class="sig-sub">${candidateName} ${offer.acceptedAt ? `• Accepted on ${formatDate(offer.acceptedAt)}` : ""}</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateOfferLetterPdf(
  offer: OfferLetterData
): Promise<{ uri: string; base64: string; filename: string }> {
  const html = buildOfferLetterHtml(offer);
  const offerNum = (offer.offerLetterNumber || "OL").replace(/[^a-zA-Z0-9-]/g, "");
  const candidate = (offer.candidateName || "Candidate")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const filename = `OfferLetter_${offerNum}_${candidate}.pdf`;

  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
  const destUri = baseDir ? `${baseDir}${filename}` : uri;

  if (base64 && baseDir) {
    try {
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // fallback
    }
  }

  return { uri: destUri, base64: base64 ?? "", filename };
}

export async function downloadOfferLetterPdf(offer: OfferLetterData): Promise<void> {
  const { uri, filename } = await generateOfferLetterPdf(offer);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `Download ${filename}`,
    });
  }
}

export async function shareOfferLetterPdf(offer: OfferLetterData): Promise<void> {
  const { uri, filename } = await generateOfferLetterPdf(offer);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `Share ${filename}`,
    });
  }
}
