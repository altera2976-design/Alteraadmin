/**
 * quotationPdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional Interior Design, Architecture & Construction Quotation PDF Generator.
 * Formatted following the OneKey Buildcon reference quotation layout with:
 * - Corporate branding & GSTIN
 * - Room/Area grouped interior work items
 * - Material specifications (Carcass, Shutter, Finish, Brand, Hardware)
 * - Dedicated kitchen/wardrobe accessories
 * - Measurement-based dimensions (L × W × H = Area)
 * - Handling fees, design charges, discount, taxable total
 * - CGST / SGST / IGST tax breakdown
 * - Amount in Words (INR)
 * - Milestone payment schedule (validated 100%)
 * - Bank details, Terms & Conditions, and Authorized Signature
 */

import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { COMPANY_LOGO_DATA_URL } from "../constants/companyLogo";
import { QuotationItemDoc } from "./quotationApi";

function inr(v: number | undefined): string {
  if (v === undefined || isNaN(v)) return "₹0";
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

function esc(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: any): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

/**
 * Returns safe filename for downloaded/shared PDF
 */
export function getPdfFileName(q: any): string {
  const client = (q.client?.name || q.customerName || "Client")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const no = (q.quotationNumber || q.quotationNo || q.id || "QT").replace(
    /[^a-zA-Z0-9-]/g,
    "",
  );
  const rev = q.revision ? `_Rev${q.revision}` : "";
  return `Quotation_${no}${rev}_${client}.pdf`;
}

/**
 * Build professional multi-page HTML matching reference quotation
 */
export function buildQuotationHtml(q: any): string {
  const company = q.companyDetails || {
    name: "ALTERA INTERIOR",
    tagline: "The Modern Home Maker • Interior | Architect | Construction",
    address: "Plot 42, Sector 18, Commercial Hub, New Delhi - 110001",
    phone: "+91 98765 43210",
    email: "contact@alterainterior.com",
    gstin: "07AAAAA0000A1Z5",
  };

  const client = q.client || {
    name: q.customerName || "Valued Client",
    company: "",
    phone: q.customerPhone || "",
    email: q.customerEmail || "",
    address: q.customerAddress || q.siteLocation || "",
    gstin: "",
  };

  const quotationNumber = q.quotationNumber || q.quotationNo || "QT-2026-0001";
  const qDate = formatDate(q.quotationDate || q.date || new Date());
  const vUntil = formatDate(
    q.validUntil || new Date(Date.now() + 30 * 86400000),
  );
  const status = (q.status || "Draft").toUpperCase();

  // ── Group Items by Room / Area ─────────────────────────────────────────────
  let roomGroups: { [roomName: string]: QuotationItemDoc[] } = {};

  if (Array.isArray(q.items) && q.items.length > 0) {
    q.items.forEach((item: any) => {
      const room = item.room || "General Works";
      if (!roomGroups[room]) roomGroups[room] = [];
      roomGroups[room].push(item);
    });
  } else if (Array.isArray(q.sections) && q.sections.length > 0) {
    // Backward compatibility with legacy sections
    q.sections.forEach((sec: any) => {
      roomGroups[sec.name] = (sec.items || []).map((it: any) => ({
        ...it,
        room: sec.name,
        name: it.description,
        quantity: parseFloat(it.qty) || 1,
        rate: parseFloat(it.rate) || 0,
        amount: (parseFloat(it.qty) || 1) * (parseFloat(it.rate) || 0),
      }));
    });
  } else {
    roomGroups["General Works"] = [];
  }

  // ── Build Room Work Item Tables ────────────────────────────────────────────
  let globalItemIndex = 0;
  let computedSubtotal = 0;

  const roomSectionsHtml = Object.keys(roomGroups)
    .map((roomName) => {
      const items = roomGroups[roomName];
      const roomTotal = items.reduce(
        (acc, it) => acc + (it.amount || it.quantity * it.rate || 0),
        0,
      );
      computedSubtotal += roomTotal;

      const itemRows = items
        .map((it) => {
          globalItemIndex++;
          const amt =
            it.amount !== undefined
              ? it.amount
              : (it.quantity || 1) * (it.rate || 0);

          // Specs badges
          const specs = it.specifications || {};
          const specEntries = Object.entries(specs).filter(([_, v]) =>
            Boolean(v),
          );
          const specsHtml =
            specEntries.length > 0
              ? `<div class="specs-grid">
                  ${specEntries
                    .map(
                      ([k, v]) =>
                        `<span class="spec-chip"><strong>${esc(k)}:</strong> ${esc(v)}</span>`,
                    )
                    .join("")}
                </div>`
              : "";

          // Accessories list
          const accs = it.accessories || [];
          const accsHtml =
            accs.length > 0
              ? `<div class="acc-box">
                  <strong>Accessories:</strong> ${accs
                    .map(
                      (a: any) =>
                        `${esc(a.name)} (${a.qty} nos - <span class="acc-type">${esc(a.inclusionType)}</span>)`,
                    )
                    .join("; ")}
                </div>`
              : "";

          // Dimension info
          const m = it.measurements;
          const dimInfo =
            m && m.length > 0 && (m.height > 0 || m.width > 0)
              ? `<div class="dim-tag">📏 ${m.length} × ${m.height || m.width} = ${m.calculatedArea} ${it.unit}</div>`
              : "";

          return `
            <tr class="item-tr">
              <td class="center col-num">${globalItemIndex}</td>
              <td class="col-desc">
                <div class="item-title">${esc(it.name)}</div>
                ${it.description ? `<div class="item-subdesc">${esc(it.description)}</div>` : ""}
                ${dimInfo}
                ${specsHtml}
                ${accsHtml}
                ${it.remarks ? `<div class="item-remark">Note: ${esc(it.remarks)}</div>` : ""}
                ${it.costVariationNote ? `<div class="variation-note">⚠️ ${esc(it.costVariationNote)}</div>` : ""}
              </td>
              <td class="center col-unit">${esc(it.unit || "Nos")}</td>
              <td class="center col-qty">${it.quantity || 1}</td>
              <td class="right col-rate">${inr(it.rate || 0)}</td>
              <td class="right col-amt">${inr(amt)}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="room-group">
          <div class="room-header">
            <div class="room-title">📍 ${esc(roomName.toUpperCase())}</div>
            <div class="room-subtotal">Area Subtotal: ${inr(roomTotal)}</div>
          </div>
          <table class="item-table">
            <thead>
              <tr>
                <th class="center" style="width: 5%;">#</th>
                <th style="width: 48%;">Item Description &amp; Specifications</th>
                <th class="center" style="width: 10%;">Unit</th>
                <th class="center" style="width: 9%;">Qty</th>
                <th class="right" style="width: 13%;">Rate</th>
                <th class="right" style="width: 15%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  // ── Pricing Breakdown ──────────────────────────────────────────────────────
  const pricing = q.pricing || {};
  const subtotal =
    pricing.subtotal !== undefined ? pricing.subtotal : computedSubtotal;
  const handlingFee =
    pricing.handlingFeeAmount !== undefined
      ? pricing.handlingFeeAmount
      : Math.round(subtotal * 0.02);
  const designFee =
    pricing.designFeeAmount !== undefined
      ? pricing.designFeeAmount
      : Math.round(subtotal * 0.02);
  const discount = pricing.discountAmount || 0;
  const taxable =
    pricing.taxableAmount !== undefined
      ? pricing.taxableAmount
      : subtotal + handlingFee + designFee - discount;
  const totalGst =
    pricing.totalGstAmount !== undefined
      ? pricing.totalGstAmount
      : Math.round(taxable * 0.18);
  const grandTotal =
    pricing.grandTotal !== undefined ? pricing.grandTotal : taxable + totalGst;
  const amountInWords = pricing.amountInWords || "";

  // ── Payment Milestones ─────────────────────────────────────────────────────
  const milestones = q.paymentMilestones || [];
  const milestonesHtml =
    milestones.length > 0
      ? `
      <div class="section-card">
        <div class="card-header">📅 PAYMENT MILESTONES SCHEDULE</div>
        <table class="milestone-table">
          <thead>
            <tr>
              <th style="width: 35%;">Milestone / Stage</th>
              <th style="width: 35%;">Deliverables / Work Description</th>
              <th class="center" style="width: 12%;">Share (%)</th>
              <th class="right" style="width: 18%;">Payable Amount</th>
            </tr>
          </thead>
          <tbody>
            ${milestones
              .map(
                (m: any) => `
              <tr>
                <td><strong>${esc(m.milestoneName)}</strong></td>
                <td>${esc(m.stage || "As per project stage approval")}</td>
                <td class="center font-bold">${m.percentage}%</td>
                <td class="right font-bold">${inr(m.amount || Math.round(grandTotal * (m.percentage / 100)))}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  // ── Bank Details ───────────────────────────────────────────────────────────
  const bank = q.bankDetails || {
    accountName: "Altera Interior Pvt. Ltd.",
    bankName: "Induslnd Bank",
    accountNumber: "201002880175",
    ifscCode: "INDB0000518",
    branch: "Gurugram Branch",
  };

  // ── Terms & Conditions ─────────────────────────────────────────────────────
  const terms = q.termsAndConditions || [
    "1. Quotation Validity: 30 days from date of issue.",
    "2. Measurement Variation: Cost may vary as per actual site measurements and drawings.",
    "3. Milestone Payments: Work commences upon milestone release.",
    "4. GST @ 18% is applicable as per government statutory norms.",
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Quotation_${esc(quotationNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #1E293B;
      background: #ffffff;
      padding: 24px;
      line-height: 1.45;
    }

    /* ── Document Header ── */
    .header-table {
      width: 100%;
      border-bottom: 3px solid #7A131A;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      color: #7A131A;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #64748B;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .company-info {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.4;
    }
    .doc-type-box {
      text-align: right;
    }
    .doc-type-title {
      font-size: 22px;
      font-weight: 900;
      color: #7A131A;
      letter-spacing: 2px;
    }
    .doc-ref-tag {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 3px;
      font-family: monospace;
    }
    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: #F1F5F9;
      color: #475569;
    }
    .status-Approved { background: #DCFCE7; color: #15803D; }
    .status-Sent { background: #E0E7FF; color: #4338CA; }
    .status-Draft { background: #FEF3C7; color: #B45309; }

    /* ── Meta Info Grid ── */
    .meta-grid {
      display: table;
      width: 100%;
      margin-bottom: 14px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .meta-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 3px;
    }
    .meta-val-name {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 3px;
    }
    .meta-row {
      font-size: 10.5px;
      color: #334155;
      margin-bottom: 2px;
    }

    /* ── Project Title Banner ── */
    .project-banner {
      background: #FFF1F2;
      border-left: 4px solid #7A131A;
      padding: 8px 14px;
      border-radius: 4px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .project-banner-title {
      font-size: 12px;
      font-weight: 800;
      color: #7A131A;
      text-transform: uppercase;
    }
    .project-banner-loc {
      font-size: 11px;
      color: #4C0519;
      font-weight: 600;
    }

    /* ── Room Groups & Item Tables ── */
    .room-group {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .room-header {
      background: #1E293B;
      color: #ffffff;
      padding: 7px 12px;
      border-radius: 4px 4px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .room-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
    }
    .room-subtotal {
      font-size: 11px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .item-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #E2E8F0;
      border-top: none;
    }
    .item-table th {
      background: #F1F5F9;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
    }
    .item-table td {
      padding: 8px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 10px;
      vertical-align: top;
    }
    .item-tr:nth-child(even) {
      background: #F8FAFC;
    }
    .item-title {
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .item-subdesc {
      font-size: 9.5px;
      color: #475569;
      margin-bottom: 4px;
    }
    .dim-tag {
      font-size: 9.5px;
      font-weight: 600;
      color: #0369A1;
      background: #E0F2FE;
      padding: 1px 6px;
      border-radius: 3px;
      display: inline-block;
      margin-bottom: 4px;
    }
    .specs-grid {
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .spec-chip {
      display: inline-block;
      font-size: 8.5px;
      background: #EEF2F6;
      color: #334155;
      padding: 1px 5px;
      border-radius: 3px;
      margin-right: 4px;
      margin-bottom: 2px;
    }
    .acc-box {
      font-size: 9px;
      background: #FEF3C7;
      color: #92400E;
      padding: 3px 6px;
      border-radius: 3px;
      margin-top: 4px;
    }
    .acc-type {
      font-weight: 700;
      font-size: 8.5px;
      color: #B45309;
    }
    .item-remark {
      font-size: 9px;
      color: #64748B;
      font-style: italic;
      margin-top: 3px;
    }
    .variation-note {
      font-size: 8.5px;
      color: #DC2626;
      font-weight: 600;
      margin-top: 2px;
    }

    .col-num { font-weight: 700; color: #64748B; }
    .col-unit { font-weight: 600; }
    .col-qty { font-weight: 700; }
    .col-rate { font-weight: 600; }
    .col-amt { font-weight: 800; color: #0F172A; }

    /* ── Summary & Grand Total ── */
    .summary-wrap {
      margin-top: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: flex-end;
      page-break-inside: avoid;
    }
    .summary-table {
      width: 45%;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 5px 8px;
      font-size: 10.5px;
    }
    .summary-table tr.total-row td {
      background: #7A131A;
      color: #ffffff;
      font-size: 13px;
      font-weight: 900;
      padding: 8px 10px;
    }
    .amount-words-box {
      background: #FFF5F5;
      border: 1px solid #FECDD3;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 11px;
      color: #881337;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }

    /* ── Section Cards (Milestones, Bank, Terms) ── */
    .section-card {
      background: #ffffff;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .card-header {
      background: #F8FAFC;
      color: #334155;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      padding: 6px 12px;
      border-bottom: 1px solid #E2E8F0;
    }
    .milestone-table {
      width: 100%;
      border-collapse: collapse;
    }
    .milestone-table th {
      background: #FAFAFA;
      font-size: 8.5px;
      color: #64748B;
      text-transform: uppercase;
      padding: 5px 8px;
      border-bottom: 1px solid #E2E8F0;
    }
    .milestone-table td {
      padding: 6px 8px;
      font-size: 9.5px;
      border-bottom: 1px solid #F1F5F9;
    }

    .bank-grid {
      display: table;
      width: 100%;
      padding: 8px 12px;
    }
    .bank-item {
      display: table-cell;
      width: 33.3%;
      font-size: 9.5px;
      line-height: 1.5;
    }

    .terms-box {
      padding: 8px 12px;
      font-size: 9px;
      color: #475569;
      line-height: 1.5;
    }

    /* ── Signature Block ── */
    .sign-table {
      width: 100%;
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 50%;
      vertical-align: bottom;
      font-size: 10px;
    }
    .sign-line {
      width: 180px;
      border-top: 1px solid #0F172A;
      margin-top: 36px;
      padding-top: 4px;
      font-weight: 700;
    }

    /* ── Utilities ── */
    .center { text-align: center; }
    .right { text-align: right; }
    .font-bold { font-weight: 700; }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="width: 60%; vertical-align: top;">
        <img src="${COMPANY_LOGO_DATA_URL}" alt="Altera Interior Logo" style="height: 52px; width: auto; max-width: 280px; object-fit: contain; margin-bottom: 6px; display: block;" />
        <div class="company-info">
          ${esc(company.address)}<br />
          Phone: ${esc(company.phone)} | Email: ${esc(company.email)}<br />
          <strong>GSTIN:</strong> ${esc(company.gstin)}
        </div>
      </td>
      <td style="width: 40%; vertical-align: top;" class="doc-type-box">
        <div class="doc-type-title">QUOTATION</div>
        <div class="doc-ref-tag">${esc(quotationNumber)}${q.revision ? ` (Rev ${q.revision})` : ""}</div>
        <div class="status-badge status-${esc(status)}">${esc(status)}</div>
        <div style="font-size: 9.5px; color: #64748B; margin-top: 4px;">
          Date: <strong>${qDate}</strong><br />
          Valid Till: <strong>${vUntil}</strong>
        </div>
      </td>
    </tr>
  </table>

  <!-- Client & Site Info -->
  <div class="meta-grid">
    <div class="meta-col">
      <div class="meta-label">Quotation Prepared For</div>
      <div class="meta-val-name">${esc(client.name)}</div>
      ${client.company ? `<div class="meta-row"><strong>Company:</strong> ${esc(client.company)}</div>` : ""}
      <div class="meta-row"><strong>Phone:</strong> ${esc(client.phone || "—")}</div>
      <div class="meta-row"><strong>Email:</strong> ${esc(client.email || "—")}</div>
      ${client.gstin ? `<div class="meta-row"><strong>Client GSTIN:</strong> ${esc(client.gstin)}</div>` : ""}
    </div>
    <div class="meta-col">
      <div class="meta-label">Site &amp; Project Coordinates</div>
      <div class="meta-val-name">${esc(q.projectTitle || "Interior Execution")}</div>
      <div class="meta-row"><strong>Project Type:</strong> ${esc(q.projectType || "Residential Interior")}</div>
      <div class="meta-row"><strong>Site Address:</strong> ${esc(q.siteLocation || client.address || "Onsite")}</div>
      <div class="meta-row"><strong>Assigned Designer:</strong> ${esc(q.assignedDesignerName || "Altera Design Team")}</div>
    </div>
  </div>

  <!-- Project Title Banner -->
  <div class="project-banner">
    <div class="project-banner-title">Project: ${esc(q.projectTitle || "Interior Execution Scope")}</div>
    <div class="project-banner-loc">Site: ${esc(q.siteLocation || "Client Residence")}</div>
  </div>

  <!-- Room-wise Interior Items -->
  ${roomSectionsHtml}

  <!-- Financial Summary -->
  <div class="summary-wrap">
    <table class="summary-table">
      <tr>
        <td class="font-bold">Raw Items Subtotal:</td>
        <td class="right font-bold">${inr(subtotal)}</td>
      </tr>
      ${
        handlingFee > 0
          ? `
      <tr>
        <td>Handling Charges (${pricing.handlingFeePercent || 2}%):</td>
        <td class="right">${inr(handlingFee)}</td>
      </tr>`
          : ""
      }
      ${
        designFee > 0
          ? `
      <tr>
        <td>Designing / Consultation Fees (${pricing.designFeePercent || 2}%):</td>
        <td class="right">${inr(designFee)}</td>
      </tr>`
          : ""
      }
      ${
        discount > 0
          ? `
      <tr>
        <td style="color: #059669;">Special Discount:</td>
        <td class="right" style="color: #059669;">-${inr(discount)}</td>
      </tr>`
          : ""
      }
      <tr style="border-top: 1px solid #CBD5E1;">
        <td class="font-bold">Taxable Amount:</td>
        <td class="right font-bold">${inr(taxable)}</td>
      </tr>
      <tr>
        <td>GST (${pricing.gstPercent || 18}% ${pricing.gstType === 'AS_PER_ACTUAL' ? '– As per Actuals' : (pricing.gstType || "CGST+SGST")}):</td>
        <td class="right" style="${pricing.gstType === 'AS_PER_ACTUAL' ? 'color: #2563EB; font-weight: 600;' : ''}">${pricing.gstType === 'AS_PER_ACTUAL' ? '18% – As per Actuals' : inr(totalGst)}</td>
      </tr>
      <tr class="total-row">
        <td>ESTIMATED GRAND TOTAL:</td>
        <td class="right">${inr(grandTotal)}</td>
      </tr>
    </table>
  </div>

  ${pricing.gstType === 'AS_PER_ACTUAL' ? `<div style="margin-top: 12px; padding: 8px 12px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; font-size: 11px; color: #1D4ED8; font-weight: 600;">ℹ️ GST @ 18% will be charged separately as applicable on the actual/final invoice and is not included in this estimated total.</div>` : ''}

  ${
    amountInWords
      ? `
  <div class="amount-words-box">
    <strong>Amount in Words:</strong> ${esc(amountInWords)}
  </div>`
      : ""
  }

  <!-- Payment Milestones Schedule -->
  ${milestonesHtml}

  <!-- Bank & Payment Details -->
  <div class="section-card">
    <div class="card-header">🏦 BANK &amp; PAYMENT DETAILS</div>
    <div class="bank-grid">
      <div class="bank-item">
        <strong>Beneficiary:</strong> ${esc(bank.accountName)}<br />
        <strong>Bank Name:</strong> ${esc(bank.bankName)}
      </div>
      <div class="bank-item">
        <strong>Account Number:</strong> ${esc(bank.accountNumber)}<br />
        <strong>IFSC Code:</strong> ${esc(bank.ifscCode)}
      </div>
      <div class="bank-item">
        <strong>Branch:</strong> ${esc(bank.branch)}<br />
      </div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  <div class="section-card">
    <div class="card-header">📜 TERMS &amp; CONDITIONS</div>
    <div class="terms-box">
      ${terms.map((t: any) => `<div style="margin-bottom: 3px;">${esc(t)}</div>`).join("")}
    </div>
  </div>

  <!-- Signatures -->
  <table class="sign-table">
    <tr>
      <td class="sign-box">
        <div class="sign-line">Client Acceptance Signature</div>
        <div style="font-size: 8.5px; color: #64748B; margin-top: 2px;">Name, Date &amp; Official Seal</div>
      </td>
      <td class="sign-box" style="text-align: right;">
        <div class="sign-line" style="margin-left: auto;">For ${esc(company.name)}</div>
        <div style="font-size: 8.5px; color: #64748B; margin-top: 2px;">Authorized Signatory</div>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Generate PDF file on device
 */
export async function generatePdf(
  q: any,
): Promise<{ uri: string; base64: string; filename: string }> {
  const html = buildQuotationHtml(q);
  const filename = getPdfFileName(q);

  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

  const baseDir =
    FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
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

/**
 * Open native share sheet (Android & iOS)
 */
export async function sharePdf(q: any): Promise<void> {
  const { uri, filename } = await generatePdf(q);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `Share ${filename}`,
    });
  }
}

/**
 * Downloads the PDF to device
 */
export async function downloadPdf(q: any): Promise<void> {
  const { uri, filename, base64 } = await generatePdf(q);

  if (Platform.OS === "android") {
    try {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        await sharePdf(q);
        return;
      }

      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        "application/pdf",
      );

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert("Quotation Downloaded", `"${filename}" saved successfully.`);
    } catch {
      await sharePdf(q);
    }
  } else {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: `Save ${filename}`,
      });
    }
  }
}
