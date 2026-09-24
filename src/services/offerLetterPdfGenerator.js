/**
 * offerLetterPdfGenerator.js
 * Dedicated clean PDF and print generator for Altera Interior Offer Letters.
 * Ensures downloaded/printed PDFs contain ONLY the Offer Letter document, excluding CRM UI.
 */

import { COMPANY_LOGO_DATA_URL } from '../constants/companyLogo';

export function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹' + Math.round(Number(val)).toLocaleString('en-IN');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export const DEFAULT_RULES = [
  {
    ruleNumber: 1,
    title: 'Client Communication & Personal Contact',
    description: "Employees must not share or use personal mobile numbers, personal email IDs or private social-media accounts for direct client communication without written authorization. All official client communication must be made through the company's authorized office number / official communication channels.",
  },
  {
    ruleNumber: 2,
    title: 'No Personal Work During Office Hours',
    description: 'During working hours, employees must devote their time and attention to the company. Employees shall not perform work, assignments, freelance projects or business activities for any other client / company during office hours.',
  },
  {
    ruleNumber: 3,
    title: 'Confidentiality',
    description: 'All client information, quotations, designs, drawings, measurements, vendor details, pricing, project information, documents, passwords and other company information must be kept strictly confidential and must not be shared with unauthorized persons.',
  },
  {
    ruleNumber: 4,
    title: 'Client & Company Property',
    description: 'Client documents, samples, keys, drawings, photographs, files, software access, company devices and other materials must be handled responsibly and returned when requested or upon separation from the company.',
  },
  {
    ruleNumber: 5,
    title: 'Professional Conduct',
    description: 'Employees must maintain professional behaviour, punctuality, appropriate communication and respectful conduct with clients, management, colleagues, vendors and contractors.',
  },
  {
    ruleNumber: 6,
    title: 'Attendance & Punctuality',
    description: 'Employees are expected to report on time and follow the working hours, attendance system and leave procedure prescribed by the company.',
  },
  {
    ruleNumber: 7,
    title: 'Leave & Absence',
    description: 'Planned leave should be requested and approved in advance. In case of an emergency or unavoidable absence, the employee must inform the reporting manager / office at the earliest possible time.',
  },
  {
    ruleNumber: 8,
    title: 'Notice Period',
    description: "An employee intending to resign or discontinue employment must provide at least 15 days' prior written notice to the company, unless otherwise agreed in writing by management.",
  },
  {
    ruleNumber: 9,
    title: 'Handover on Exit',
    description: 'Before leaving the company, the employee must complete pending responsibilities and provide a proper handover of files, client information, project status, passwords, company property and other work-related materials.',
  },
  {
    ruleNumber: 10,
    title: 'Conflict of Interest',
    description: "Employees must disclose any situation that may create a conflict between their personal interests and the company's interests. No employee may use company clients, leads or resources for personal commercial benefit.",
  },
  {
    ruleNumber: 11,
    title: 'No Unauthorized Commitments',
    description: 'Employees must not promise prices, discounts, timelines, designs, refunds, services or other commitments to clients on behalf of the company without authorization.',
  },
  {
    ruleNumber: 12,
    title: 'Use of Company Resources',
    description: 'Company systems, software, internet, devices, documents and other resources must be used responsibly and primarily for official work.',
  },
  {
    ruleNumber: 13,
    title: 'Social Media & Public Communication',
    description: 'Employees must not publish confidential project information, client details, internal documents or statements representing the company without authorization.',
  },
  {
    ruleNumber: 14,
    title: 'Policy Updates',
    description: 'The company may update its internal policies, procedures and operational guidelines from time to time. Employees are expected to comply with applicable updated policies communicated by management.',
  },
  {
    ruleNumber: 15,
    title: 'Disciplinary Action',
    description: 'Violation of company rules, misuse of confidential information, unauthorized client dealing, fraud, serious misconduct or repeated non-compliance may result in disciplinary action, up to and including termination, subject to applicable law and company policy.',
  },
];

export function buildOfferLetterHtml(offer) {
  if (!offer) return '<html><body><p>No offer letter data provided.</p></body></html>';

  const rulesList = Array.isArray(offer.rulesAndRegulations) && offer.rulesAndRegulations.length > 0
    ? offer.rulesAndRegulations
    : DEFAULT_RULES;

  const offerNum = offer.offerLetterNumber || 'OL-DRAFT';
  const offerDate = formatDate(offer.offerLetterDate || offer.createdAt);
  const joiningDateStr = formatDate(offer.joiningDate);
  const candidateName = offer.candidateName || 'Candidate';
  const designation = offer.designation || 'Staff';
  const department = offer.department || 'General';
  const workLoc = offer.workLocation || 'Gurugram, Haryana';
  const probation = offer.probationPeriod || '3 Months';
  const notice = offer.noticePeriod || '30 Days';
  const manager = offer.reportingManager || 'Management / HR';
  const empType = offer.employmentType || 'Full Time';
  const monthlySalaryStr = formatINR(offer.monthlySalary);
  const annualCtcStr = formatINR(offer.annualCTC);
  const greetingText = offer.greetingText || `Dear ${candidateName},`;
  const offerParagraph = offer.offerParagraph || `We are pleased to offer you the position of ${designation} in the ${department} department at Altera Interior. We were very impressed with your skills and background during the interview process.`;
  const payCycle = offer.salaryPaymentCycle || 'Salary will be credited / paid on or before the 10th of every month, subject to attendance, approved leave and applicable company policies.';

  const rulesHtml = rulesList
    .map((r, idx) => {
      const num = r.ruleNumber || idx + 1;
      const title = r.title || '';
      const desc = r.description || (typeof r === 'string' ? r : '');
      return `
        <div class="rule-item">
          <div class="rule-title">${num}. ${title}</div>
          <div class="rule-desc">${desc}</div>
        </div>
      `;
    })
    .join('');

  const sigCandidate = offer.status === 'ACCEPTED' && offer.candidateSignature
    ? (offer.candidateSignature.startsWith('data:image')
        ? `<img src="${offer.candidateSignature}" alt="Candidate Signature" style="max-height: 40px; margin-bottom: 4px;" />`
        : `<div style="font-family: 'Dancing Script', cursive, cursive; font-size: 18px; font-weight: bold; color: #1E293B;">${offer.candidateSignature}</div>`)
    : `<div style="height: 30px;"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Offer Letter - ${offerNum} - ${candidateName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4;
      margin: 12mm 15mm 12mm 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1E293B;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .page-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
      background: #FFFFFF;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #9F0B22;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #9F0B22;
      letter-spacing: -0.5px;
      margin: 0;
    }

    .brand-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-title {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .doc-sub {
      font-size: 11.5px;
      color: #64748B;
      margin-top: 2px;
    }

    .candidate-to {
      margin-bottom: 16px;
    }

    .candidate-name {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      margin: 2px 0;
    }

    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12.5px;
    }

    .terms-table td {
      padding: 8px 12px;
      border: 1px solid #E2E8F0;
    }

    .terms-table tr:nth-child(even) {
      background-color: #F8FAFC;
    }

    .label-cell {
      font-weight: 600;
      color: #475569;
      width: 40%;
    }

    .val-cell {
      font-weight: 600;
      color: #0F172A;
    }

    .section-heading {
      font-size: 13px;
      font-weight: 800;
      color: #9F0B22;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 24px;
      margin-bottom: 10px;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 4px;
      page-break-after: avoid;
      break-after: avoid;
    }

    .rule-item {
      margin-bottom: 8px;
      padding: 4px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .rule-title {
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }

    .rule-desc {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.45;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sig-box {
      width: 45%;
    }

    .sig-title {
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
    }

    .sig-sub {
      font-size: 11px;
      color: #64748B;
    }

    @media print {
      body {
        padding: 0;
        background: #FFFFFF;
      }
      .page-container {
        max-width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <div class="header-bar">
      <div>
        <img src="${COMPANY_LOGO_DATA_URL}" alt="Altera Interior Logo" style="height: 54px; width: auto; max-width: 280px; object-fit: contain; display: block;" />
      </div>
      <div class="doc-meta">
        <div class="doc-title">OFFER OF EMPLOYMENT</div>
        <div class="doc-sub">Ref: <strong>${offerNum}</strong></div>
        <div class="doc-sub">Date: ${offerDate}</div>
      </div>
    </div>

    <!-- Recipient -->
    <div class="candidate-to">
      <div>To,</div>
      <div class="candidate-name">${candidateName}</div>
      <div style="font-size: 12px; color: #475569;">${offer.fatherGuardianName ? `S/o or D/o: ${offer.fatherGuardianName} • ` : ''}${offer.email || ''} | ${offer.mobile || ''}</div>
      ${offer.address ? `<div style="font-size: 11.5px; color: #64748B;">Address: ${offer.address}</div>` : ''}
    </div>

    <!-- Opening -->
    <p style="margin-top: 14px;">${greetingText}</p>
    <p>${offerParagraph}</p>

    <!-- Terms Summary -->
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
          <td class="val-cell" style="color: #9F0B22;">${joiningDateStr}</td>
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

    <div style="font-size: 11.5px; color: #475569; background: #F8FAFC; padding: 8px 12px; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 16px;">
      <strong>Salary Disbursement Policy:</strong> ${payCycle}
    </div>

    <!-- Terms & Rules -->
    <div class="section-heading">Company Terms, Rules &amp; Regulations</div>
    <p style="font-size: 11.5px; color: #64748B; margin-bottom: 10px;">
      Your employment with Altera Interior will be governed by the following mandatory operational policies:
    </p>
    ${rulesHtml}

    <p style="margin-top: 18px; font-size: 12.5px;">
      We welcome you to the Altera Interior team and look forward to building extraordinary interior spaces together!
    </p>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-box">
        <div style="height: 30px;"></div>
        <div class="sig-title">Authorized Signatory</div>
        <div class="sig-sub">Altera Interior HR &amp; Management Team</div>
      </div>
      <div class="sig-box" style="text-align: right;">
        ${sigCandidate}
        <div class="sig-title">Candidate Acceptance Signature</div>
        <div class="sig-sub">${candidateName} ${offer.acceptedAt ? `• Accepted on ${formatDate(offer.acceptedAt)}` : ''}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printOfferLetterPdf(offer) {
  if (!offer) {
    alert('Offer Letter data is missing.');
    return;
  }
  const htmlContent = buildOfferLetterHtml(offer);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    alert('Please allow popups in your browser to view and download the Offer Letter PDF.');
  }
}
