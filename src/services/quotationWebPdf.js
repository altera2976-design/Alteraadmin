/**
 * quotationWebPdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional Web PDF & Print Generator for Altera Interior & Architecture Quotations.
 * Generates branded multi-page printable document matching corporate standards.
 */

import { COMPANY_LOGO_DATA_URL } from "../constants/companyLogo";

export function formatINR(v) {
  if (v === undefined || v === null || isNaN(v)) return "₹0";
  return "₹" + Math.round(Number(v)).toLocaleString("en-IN");
}

export function formatDate(d) {
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

export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function utf8ToBase64(str) {
  if (!str) return "";
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function buildQuotationHtml(q) {
  const defaultCompany = {
    name: "ALTERA INTERIOR",
    tagline: "The Modern Home Maker • Interior | Architect | Construction",
    address:
      "Plot 16/2, Dhanwapur Village, Behind ATS Triumph Tower, Dwarka Expressway, Sec-104, Gurugram (HR)",
    phone: "+91 9718374407",
    email: "info@alterainterior.com",
    gstin: "06CFEPS8731P1Z0",
  };

  const rawCompany = q.companyDetails || {};
  const company = {
    name: rawCompany.name || defaultCompany.name,
    tagline: rawCompany.tagline || defaultCompany.tagline,
    address:
      !rawCompany.address ||
      rawCompany.address.includes("Plot 42") ||
      rawCompany.address.includes("New Delhi")
        ? defaultCompany.address
        : rawCompany.address,
    phone:
      !rawCompany.phone || rawCompany.phone.includes("98765")
        ? defaultCompany.phone
        : rawCompany.phone,
    email:
      !rawCompany.email ||
      rawCompany.email.includes("EMAIL_ADDRESS") ||
      rawCompany.email.includes("contact@alterainterior.com")
        ? defaultCompany.email
        : rawCompany.email,
    gstin:
      !rawCompany.gstin || rawCompany.gstin.includes("07AAAAA")
        ? defaultCompany.gstin
        : rawCompany.gstin,
  };

  const bank = q.bankDetails || {
    accountName: "Altera Interior",
    bankName: "IndusInd Bank Limited",
    accountNumber: "201002880175",
    ifscCode: "INDB0000518",
    branch: "Sector-31, Gurgaon Branch",
    bankAddress:
      "SCO-8, Sector 31/32A HUDA Market, Gurgaon – 122 002, Haryana, India",
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
  const qDate = formatDate(q.quotationDate || q.createdAt || new Date());
  const vUntil = formatDate(
    q.validUntil || new Date(Date.now() + 30 * 86400000),
  );
  const status = (q.status || "Draft").toUpperCase();

  // Group Items by Room / Area
  const roomGroups = {};
  if (Array.isArray(q.items) && q.items.length > 0) {
    q.items.forEach((item) => {
      const room = item.room || "General Works";
      if (!roomGroups[room]) roomGroups[room] = [];
      roomGroups[room].push(item);
    });
  } else {
    roomGroups["General Scope"] = [];
  }

  let globalItemIndex = 0;
  let computedSubtotal = 0;

  const roomSectionsHtml = Object.keys(roomGroups)
    .map((roomName) => {
      const items = roomGroups[roomName];
      const getItemAmt = (it) => {
        const baseAmt = Math.round((it.quantity || 1) * (it.rate || 0));
        const accTotal = (it.accessories || []).reduce(
          (sum, a) => {
            if (a.name && it.name && a.name.trim().toLowerCase() === it.name.trim().toLowerCase()) return sum;
            return (
              sum +
              (a.cost !== undefined
                ? Number(a.cost)
                : (Number(a.qty) || 1) * (Number(a.unitPrice) || 0))
            );
          },
          0,
        );
        const expected = baseAmt + accTotal;
        return it.amount !== undefined && Number(it.amount) > expected
          ? Number(it.amount)
          : expected;
      };

      const roomTotal = items.reduce(
        (acc, it) => acc + getItemAmt(it),
        0,
      );
      computedSubtotal += roomTotal;

      const itemRows = items
        .map((it) => {
          globalItemIndex++;
          const amt = getItemAmt(it);

          const specs = it.specifications || {};
          const specEntries = Object.entries(specs).filter(([_, v]) =>
            Boolean(v),
          );
          const specsHtml =
            specEntries.length > 0
              ? `<div class="item-specs"><strong>Specifications:</strong> ${specEntries
                  .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
                  .join(" | ")}</div>`
              : "";

          const accs = it.accessories || [];
          const accsHtml =
            accs.length > 0
              ? `<div class="item-accs"><strong>Accessories:</strong> ${accs
                  .map((a) => {
                    const qty = a.qty || 1;
                    const unitPrice =
                      a.unitPrice || (a.cost ? Math.round(a.cost / qty) : 0);
                    const totalCost = a.cost || qty * unitPrice;
                    return `${escapeHtml(a.name)} (Qty: ${qty}, Unit Price: ${formatINR(unitPrice)}, Total: ${formatINR(totalCost)})`;
                  })
                  .join("; ")}</div>`
              : "";

          const m = it.measurements;
          const dimInfo =
            m && m.length > 0 && (m.height > 0 || m.width > 0)
              ? `<div class="item-specs"><strong>Measurements:</strong> ${m.length} × ${m.height || m.width} = ${m.calculatedArea} ${it.unit}</div>`
              : "";

          return `
            <tr>
              <td class="center font-bold">${globalItemIndex}</td>
              <td>
                <div class="item-name">${escapeHtml(it.name)}</div>
                ${it.description ? `<div class="item-desc">${escapeHtml(it.description)}</div>` : ""}
                ${dimInfo}
                ${specsHtml}
                ${accsHtml}
                ${it.remarks ? `<div class="item-note">Note: ${escapeHtml(it.remarks)}</div>` : ""}
                ${it.costVariationNote ? `<div class="item-note" style="color: #DC2626;">${escapeHtml(it.costVariationNote)}</div>` : ""}
              </td>
              <td class="center">${escapeHtml(it.unit || "Nos")}</td>
              <td class="center font-bold">${it.quantity || 1}</td>
              <td class="right">${formatINR(it.rate || 0)}</td>
              <td class="right font-bold">${formatINR(amt)}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="room-block">
          <div class="room-header">
            <span>${escapeHtml(roomName.toUpperCase())}</span>
            <span>Area Subtotal: ${formatINR(roomTotal)}</span>
          </div>
          <table class="item-table">
            <thead>
              <tr>
                <th class="center" style="width: 4%;">#</th>
                <th style="width: 48%;">Item Description &amp; Specifications</th>
                <th class="center" style="width: 10%;">Unit</th>
                <th class="center" style="width: 8%;">Qty</th>
                <th class="right" style="width: 14%;">Rate</th>
                <th class="right" style="width: 16%;">Amount</th>
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

  // Standalone Accessories
  const accessoriesList = Array.isArray(q.standaloneAccessories) ? q.standaloneAccessories : [];
  const accessoriesHtml =
    accessoriesList.length > 0
      ? `
      <div class="section-title">4. Accessories</div>
      <table class="item-table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th class="center" style="width: 5%;">#</th>
            <th class="center" style="width: 15%;">Image</th>
            <th style="width: 35%;">Accessory Name &amp; Description</th>
            <th class="center" style="width: 10%;">Unit</th>
            <th class="center" style="width: 8%;">Qty</th>
            <th class="right" style="width: 12%;">Price</th>
            <th class="right" style="width: 15%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${accessoriesList
            .map(
              (acc, idx) => `
            <tr>
              <td class="center font-bold">${idx + 1}</td>
              <td class="center" style="vertical-align: middle;">
                ${
                  acc.image
                    ? `<img src="${acc.image}" alt="${escapeHtml(acc.name)}" style="max-width: 55px; max-height: 55px; object-fit: cover; border-radius: 4px; border: 1px solid #CBD5E1; display: inline-block;" />`
                    : `<span style="font-size: 7.5pt; color: #94A3B8; font-style: italic;">No Image</span>`
                }
              </td>
              <td>
                <div class="item-name">${escapeHtml(acc.name)}</div>
                ${acc.description ? `<div class="item-desc">${escapeHtml(acc.description)}</div>` : ""}
              </td>
              <td class="center">${escapeHtml(acc.unit || "Pcs")}</td>
              <td class="center font-bold">${acc.quantity || 1}</td>
              <td class="right">${formatINR(acc.price || 0)}</td>
              <td class="right font-bold">${formatINR(acc.total || (acc.quantity || 1) * (acc.price || 0))}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>`
      : "";

  // Financial calculations
  const p = q.pricing || {};
  const accessoriesTotal = p.accessoriesTotal !== undefined
    ? p.accessoriesTotal
    : accessoriesList.reduce((sum, a) => sum + (Number(a.total) || (Number(a.quantity) || 1) * (Number(a.price) || 0)), 0);
  const itemsSubtotal = computedSubtotal;
  const subtotal = p.subtotal !== undefined ? p.subtotal : (itemsSubtotal + accessoriesTotal);
  const handlingAmt = p.handlingFeeAmount || Math.round(subtotal * ((p.handlingFeePercent || 0) / 100));
  const designAmt = p.designFeeAmount || Math.round(subtotal * ((p.designFeePercent || 0) / 100));
  const transportAmt = p.transportCharges || 0;
  const discountAmt = p.discountAmount || 0;
  const taxable =
    p.taxableAmount !== undefined
      ? p.taxableAmount
      : subtotal + handlingAmt + designAmt + transportAmt - discountAmt;
  const gstAmt = p.totalGstAmount || 0;
  const cgst = Math.round(gstAmt / 2);
  const sgst = gstAmt - cgst;
  const grandTotal =
    p.grandTotal !== undefined ? p.grandTotal : taxable + gstAmt;

  // Payment milestones
  const milestones = q.paymentMilestones || [];
  const milestoneSectionNum = accessoriesList.length > 0 ? "5" : "4";
  const costSummarySectionNum = accessoriesList.length > 0 ? "6" : "5";
  const paymentHistorySectionNum = accessoriesList.length > 0 ? "7" : "6";
  const bankSectionNum = accessoriesList.length > 0 ? "8" : "7";

  const milestonesHtml =
    milestones.length > 0
      ? `
      <div class="section-title">${milestoneSectionNum}. Payment Milestones</div>
      <table class="standard-table">
        <thead>
          <tr>
            <th style="width: 5%;" class="center">#</th>
            <th style="width: 35%;">Milestone / Stage</th>
            <th style="width: 40%;">Stage Description / Deliverables</th>
            <th class="center" style="width: 8%;">Share (%)</th>
            <th class="right" style="width: 12%;">Payable</th>
          </tr>
        </thead>
        <tbody>
          ${milestones
            .map(
              (m, idx) => `
            <tr>
              <td class="center">${idx + 1}</td>
              <td><strong>${escapeHtml(m.milestoneName)}</strong></td>
              <td>${escapeHtml(m.stage || "As per stage completion approval")}</td>
              <td class="center font-bold">${m.percentage}%</td>
              <td class="right font-bold">${formatINR(m.amount || Math.round(grandTotal * (m.percentage / 100)))}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>`
      : "";

  const txList = Array.isArray(q.transactions) ? q.transactions : [];
  const calculatedPaidAmount = txList.reduce(
    (acc, tx) =>
      acc +
      (tx.status === "Completed" ||
      tx.status === "PAID" ||
      tx.status === "COMPLETED"
        ? Number(tx.amount || 0)
        : 0),
    0,
  );
  const paySummary = q.paymentSummary || {
    totalAmount: grandTotal,
    paidAmount: calculatedPaidAmount,
    remainingAmount: Math.max(0, grandTotal - calculatedPaidAmount),
    paymentStatus:
      calculatedPaidAmount >= grandTotal && grandTotal > 0
        ? "PAID"
        : calculatedPaidAmount > 0
          ? "PARTIALLY_PAID"
          : "UNPAID",
  };

  const paymentSummaryHtml = `
    <div class="section-title">${paymentHistorySectionNum}. Payment &amp; Transaction History</div>
    <table class="standard-table">
      <thead>
        <tr>
          <th style="width: 25%;">Payment Status</th>
          <th style="width: 25%;" class="right">Total Amount</th>
          <th style="width: 25%;" class="right">Total Paid</th>
          <th style="width: 25%;" class="right">Balance Remaining</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold">${escapeHtml(paySummary.paymentStatus.replace("_", " "))}</td>
          <td class="right font-bold">${formatINR(paySummary.totalAmount || grandTotal)}</td>
          <td class="right font-bold" style="color: #059669;">${formatINR(paySummary.paidAmount)}</td>
          <td class="right font-bold" style="color: #DC2626;">${formatINR(paySummary.remainingAmount)}</td>
        </tr>
      </tbody>
    </table>

    ${
      txList.length > 0
        ? `
      <table class="standard-table">
        <thead>
          <tr>
            <th style="width: 5%;" class="center">#</th>
            <th style="width: 30%;">Txn Ref ID</th>
            <th style="width: 20%;">Date</th>
            <th style="width: 20%;">Payment Mode</th>
            <th style="width: 10%;" class="center">Status</th>
            <th class="right" style="width: 15%;">Amount Paid</th>
          </tr>
        </thead>
        <tbody>
          ${txList
            .map(
              (tx, idx) => `
            <tr>
              <td class="center">${idx + 1}</td>
              <td><strong>${escapeHtml(tx.transactionId || tx.referenceId || "TXN")}</strong></td>
              <td>${formatDate(tx.transactionDate || tx.createdAt)}</td>
              <td>${escapeHtml(tx.paymentMethod || "UPI")}</td>
              <td class="center" style="color: #059669; font-weight: 700;">${escapeHtml(tx.status || "Completed")}</td>
              <td class="right font-bold">${formatINR(tx.amount)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>`
        : ""
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Quotation_${escapeHtml(quotationNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5pt;
      color: #1E293B;
      background: #FFFFFF;
      line-height: 1.4;
      padding: 10px 0;
    }

    /* ── Header ── */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-logo {
      height: 48px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
      margin-bottom: 6px;
      display: block;
    }
    .company-name {
      font-size: 14pt;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 0.5px;
    }
    .company-details {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
    }
    .doc-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 9pt;
      color: #334155;
      margin-top: 4px;
      line-height: 1.4;
    }
    .doc-status {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      border: 1px solid #CBD5E1;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
      background: #F8FAFC;
    }

    /* ── Client & Project Info ── */
    .info-section {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .info-card {
      width: 49%;
      vertical-align: top;
      border: 1px solid #CBD5E1;
      background: #F8FAFC;
      padding: 10px 12px;
    }
    .info-card-title {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0F172A;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #CBD5E1;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .info-card-name {
      font-size: 11pt;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .info-row {
      font-size: 8.5pt;
      color: #334155;
      margin-bottom: 2px;
    }

    /* ── Section Title ── */
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0F172A;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #0F172A;
      padding-bottom: 3px;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    /* ── Room / Scope Group ── */
    .room-block {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .room-header {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-bottom: none;
      padding: 6px 10px;
      font-size: 9.5pt;
      font-weight: 800;
      color: #0F172A;
      display: flex;
      justify-content: space-between;
    }

    /* ── Item Table ── */
    .item-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      font-size: 8.5pt;
    }
    .item-table th {
      background: #F8FAFC;
      color: #334155;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
      border-right: 1px solid #E2E8F0;
    }
    .item-table th:last-child {
      border-right: none;
    }
    .item-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
      vertical-align: top;
      color: #1E293B;
    }
    .item-table td:last-child {
      border-right: none;
    }
    .item-table tr:nth-child(even) {
      background: #FAFAFA;
    }
    .item-name {
      font-weight: 700;
      color: #0F172A;
      font-size: 9pt;
      margin-bottom: 2px;
    }
    .item-desc {
      color: #475569;
      margin-bottom: 3px;
      font-size: 8pt;
    }
    .item-specs {
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
    .item-accs {
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
    .item-note {
      font-size: 7.5pt;
      color: #64748B;
      font-style: italic;
      margin-top: 2px;
    }

    /* ── Summary Table & Layout ── */
    .summary-container {
      width: 100%;
      margin-top: 16px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .summary-table {
      width: 48%;
      margin-left: auto;
      border-collapse: collapse;
      font-size: 9pt;
      border: 1px solid #CBD5E1;
    }
    .summary-table td {
      padding: 5px 10px;
      border-bottom: 1px solid #E2E8F0;
    }
    .summary-table tr.grand-row td {
      background: #0F172A;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 10.5pt;
      border-bottom: none;
    }

    /* ── Tables (Milestones, Transactions, Bank) ── */
    .standard-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      font-size: 8.5pt;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .standard-table th {
      background: #F8FAFC;
      color: #334155;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
      border-right: 1px solid #E2E8F0;
    }
    .standard-table th:last-child {
      border-right: none;
    }
    .standard-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
      color: #1E293B;
    }
    .standard-table td:last-child {
      border-right: none;
    }

    /* ── Bank Grid Horizontal ── */
    .bank-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      font-size: 8.5pt;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .bank-table td {
      padding: 8px 10px;
      border-right: 1px solid #E2E8F0;
      vertical-align: top;
    }
    .bank-table td:last-child {
      border-right: none;
    }

    /* ── Terms & Notes ── */
    .terms-block {
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      padding: 8px 12px;
      font-size: 8pt;
      color: #475569;
      line-height: 1.4;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    /* ── Signatures ── */
    .signature-table {
      width: 100%;
      margin-top: 32px;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      vertical-align: bottom;
    }
    .signature-line {
      border-top: 1px solid #0F172A;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 9pt;
      font-weight: 700;
      color: #0F172A;
    }
    .signature-sub {
      font-size: 8pt;
      color: #64748B;
    }

    /* Helper Utilities */
    .center { text-align: center; }
    .right { text-align: right; }
    .font-bold { font-weight: 700; }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="width: 55%; vertical-align: top;">
        <img src="${COMPANY_LOGO_DATA_URL}" alt="Altera Interior Logo" class="company-logo" />
        <div class="company-name">${escapeHtml(company.name)}</div>
        <div class="company-details">
          ${escapeHtml(company.address)}<br />
          Phone: ${escapeHtml(company.phone)} &bull; Email: ${escapeHtml(company.email)}<br />
          <strong>GSTIN:</strong> ${escapeHtml(company.gstin)}
        </div>
      </td>
      <td style="width: 45%; vertical-align: top;" class="header-right">
        <div class="doc-title">OFFICIAL QUOTATION</div>
        <div class="doc-meta">
          <strong>Quotation No:</strong> ${escapeHtml(quotationNumber)}${q.revision ? ` (Rev ${q.revision})` : ""}<br />
          <strong>Date:</strong> ${qDate}<br />
          <strong>Valid Until:</strong> ${vUntil}
        </div>
        <div class="doc-status">${escapeHtml(status)}</div>
      </td>
    </tr>
  </table>

  <!-- 1. Client Information & 2. Project & Site Details -->
  <table class="info-section">
    <tr>
      <td class="info-card" style="width: 49%;">
        <div class="info-card-title">1. Client Information</div>
        <div class="info-card-name">${escapeHtml(client.name)}</div>
        ${client.company ? `<div class="info-row"><strong>Company:</strong> ${escapeHtml(client.company)}</div>` : ""}
        <div class="info-row"><strong>Phone:</strong> ${escapeHtml(client.phone || "—")}</div>
        <div class="info-row"><strong>Email:</strong> ${escapeHtml(client.email || "—")}</div>
        ${client.gstin ? `<div class="info-row"><strong>GSTIN:</strong> ${escapeHtml(client.gstin)}</div>` : ""}
      </td>
      <td style="width: 2%;"></td>
      <td class="info-card" style="width: 49%;">
        <div class="info-card-title">2. Project &amp; Site Details</div>
        <div class="info-card-name">${escapeHtml(q.projectTitle || "Interior Execution")}</div>
        <div class="info-row"><strong>Project Type:</strong> ${escapeHtml(q.projectType || "Residential Interior")}</div>
        <div class="info-row"><strong>Site Address:</strong> ${escapeHtml(q.siteLocation || client.address || "Onsite")}</div>
        <div class="info-row"><strong>Designer:</strong> ${escapeHtml(q.assignedDesignerName || "Altera Design Team")}</div>
      </td>
    </tr>
  </table>

  <!-- 3. Items / Scope of Work -->
  <div class="section-title">3. Scope &amp; Room Items</div>
  ${roomSectionsHtml}

  <!-- 4. Accessories -->
  ${accessoriesHtml}

  <!-- Payment Milestones -->
  ${milestonesHtml}

  <!-- Cost Summary -->
  <div class="section-title">${costSummarySectionNum}. Cost Summary</div>
  <div class="summary-container">
    <table class="summary-table">
      <tr>
        <td>Subtotal:</td>
        <td class="right font-bold">${formatINR(subtotal)}</td>
      </tr>
      ${
        designAmt > 0 || (p.designFeePercent || 0) > 0
          ? `
      <tr>
        <td>Design Fees (${p.designFeePercent || 0}%):</td>
        <td class="right">${formatINR(designAmt)}</td>
      </tr>`
          : ""
      }
      ${
        handlingAmt > 0 || (p.handlingFeePercent || 0) > 0
          ? `
      <tr>
        <td>Handling Fees (${p.handlingFeePercent || 0}%):</td>
        <td class="right">${formatINR(handlingAmt)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td>Transportation Charges:</td>
        <td class="right font-bold">${formatINR(transportAmt)}</td>
      </tr>
      ${
        discountAmt > 0
          ? `
      <tr>
        <td style="color: #059669;">Discount:</td>
        <td class="right" style="color: #059669;">-${formatINR(discountAmt)}</td>
      </tr>`
          : ""
      }
      <tr style="border-top: 1px solid #CBD5E1;">
        <td class="font-bold">Taxable Amount:</td>
        <td class="right font-bold">${formatINR(taxable)}</td>
      </tr>
      ${
        p.gstType === "AS_PER_ACTUAL"
          ? `
      <tr>
        <td>GST / Taxes (18% – As per Actuals):</td>
        <td class="right" style="color: #2563EB; font-weight: 600;">As per Actuals</td>
      </tr>`
          : `
      <tr>
        <td>CGST (${(p.gstPercent || 18) / 2}%):</td>
        <td class="right">${formatINR(cgst)}</td>
      </tr>
      <tr>
        <td>SGST (${(p.gstPercent || 18) / 2}%):</td>
        <td class="right">${formatINR(sgst)}</td>
      </tr>`
      }
      <tr class="grand-row">
        <td>GRAND TOTAL:</td>
        <td class="right">${formatINR(grandTotal)}</td>
      </tr>
    </table>
  </div>
  ${
    p.gstType === "AS_PER_ACTUAL"
      ? `<div style="font-size: 8.5pt; color: #1D4ED8; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 6px 10px; margin-bottom: 12px; font-weight: 600;">GST @ 18% will be charged separately as applicable on the actual/final invoice and is not included in this estimated total.</div>`
      : ""
  }

  <!-- 6. Payment & Transaction History -->
  ${paymentSummaryHtml}

  <!-- 7. Bank & Payment Details -->
  <div class="section-title">7. Bank &amp; Payment Details</div>
  <table class="bank-table">
    <tr>
      <td style="width: 20%;"><strong>Beneficiary:</strong><br />${escapeHtml(bank.accountName)}</td>
      <td style="width: 20%;"><strong>Bank Name:</strong><br />${escapeHtml(bank.bankName)}</td>
      <td style="width: 20%;"><strong>Account Number:</strong><br />${escapeHtml(bank.accountNumber)}</td>
      <td style="width: 15%;"><strong>IFSC Code:</strong><br />${escapeHtml(bank.ifscCode)}</td>
      <td style="width: 25%;"><strong>Branch:</strong><br />${escapeHtml(bank.branch)}${bank.bankAddress ? `<br/><span style="font-size: 7.5pt; color: #64748B;">${escapeHtml(bank.bankAddress)}</span>` : ""}</td>
    </tr>
  </table>

  <!-- Terms & Notes -->
  ${
    q.notes
      ? `
  <div class="terms-block">
    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px; text-transform: uppercase;">Notes &amp; Terms</div>
    <div>${escapeHtml(q.notes)}</div>
  </div>`
      : ""
  }

  <!-- 8. Signature Section -->
  <table class="signature-table">
    <tr>
      <td style="width: 50%;"></td>
      <td class="signature-box" style="width: 50%; text-align: right;">
        <div class="signature-line" style="margin-left: auto;">For ${escapeHtml(company.name)}</div>
        <div class="signature-sub">Authorized Signatory</div>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function printQuotation(q) {
  const html = buildQuotationHtml(q);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert("Please allow popups to view and print the PDF.");
  }
}
