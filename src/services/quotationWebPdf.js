/**
 * quotationWebPdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional Web PDF & Print Generator for Altera Interior & Architecture Quotations.
 * Generates branded multi-page printable document matching corporate standards.
 */

import { COMPANY_LOGO_DATA_URL } from "../constants/companyLogo";
import api from "./api";

const API_HOST = api.defaults.baseURL.replace(/\/api\/?$/, "");

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

export function formatDateTime(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
  let roomGroups = {};

  if (Array.isArray(q.items) && q.items.length > 0) {
    q.items.forEach((item) => {
      const room = item.room || "General Works";
      if (!roomGroups[room]) roomGroups[room] = [];
      roomGroups[room].push(item);
    });
  } else if (Array.isArray(q.sections) && q.sections.length > 0) {
    // Backward compatibility with legacy sections
    q.sections.forEach((sec) => {
      roomGroups[sec.name] = (sec.items || []).map((it) => ({
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
      const getItemAmt = (it) => {
        const baseAmt = Math.round((it.quantity || 1) * (it.rate || 0));
        const accTotal = (it.accessories || []).reduce(
          (sum, a) => {
            if (
              a.name &&
              it.name &&
              a.name.trim().toLowerCase() === it.name.trim().toLowerCase()
            )
              return sum;
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

      const roomTotal = items.reduce((acc, it) => acc + getItemAmt(it), 0);
      computedSubtotal += roomTotal;

      const itemRows = items
        .map((it) => {
          globalItemIndex++;
          const amt = getItemAmt(it);

          // Specs list
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

          // Accessories list
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

          // Dimension info
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

  // ── Standalone Accessories ─────────────────────────────────────────────
  const standaloneAccessories = Array.isArray(q.standaloneAccessories)
    ? q.standaloneAccessories
    : [];
  const accessoriesTotal = standaloneAccessories.reduce(
    (sum, a) =>
      sum +
      (Number(a.total) || (Number(a.quantity) || 1) * (Number(a.price) || 0)),
    0,
  );

  const standaloneAccHtml =
    standaloneAccessories.length > 0
      ? `
      <div class="section-title">4. Standalone Accessories</div>
      <table class="item-table">
        <thead>
          <tr>
            <th class="center" style="width: 5%;">#</th>
            <th class="center" style="width: 12%;">Image</th>
            <th style="width: 45%;">Accessory Name &amp; Description</th>
            <th class="center" style="width: 8%;">Qty</th>
            <th class="center" style="width: 8%;">Unit</th>
            <th class="right" style="width: 10%;">Unit Price</th>
            <th class="right" style="width: 12%;">Total Price</th>
          </tr>
        </thead>
        <tbody>
          ${standaloneAccessories
            .map((acc, idx) => {
              const accTotal =
                Number(acc.total) ||
                (Number(acc.quantity) || 1) * (Number(acc.price) || 0);
              return `
            <tr>
              <td class="center font-bold">${idx + 1}</td>
              <td class="center">
                ${acc.image ? `<img src="${acc.image.startsWith('/') ? API_HOST + acc.image : acc.image}" style="max-width: 80px; max-height: 80px; object-fit: contain; border-radius: 4px; border: 1px solid #CBD5E1;" />` : '<span style="color: #94A3B8; font-size: 7.5pt;">No Image</span>'}
              </td>
              <td>
                <div class="item-name">${escapeHtml(acc.name)}</div>
                ${acc.description ? `<div class="item-desc">${escapeHtml(acc.description)}</div>` : ""}
              </td>
              <td class="center font-bold">${acc.quantity || 1}</td>
              <td class="center">${escapeHtml(acc.unit || "Nos")}</td>
              <td class="right">${formatINR(acc.price || 0)}</td>
              <td class="right font-bold">${formatINR(accTotal)}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>`
      : "";

  // ── Pricing Breakdown ──────────────────────────────────────────────────────
  const pricing = q.pricing || {};
  const subtotal =
    pricing.subtotal !== undefined
      ? pricing.subtotal
      : computedSubtotal + accessoriesTotal;
  const handlingFee =
    pricing.handlingFeeAmount !== undefined
      ? pricing.handlingFeeAmount
      : Math.round(subtotal * 0.02);
  const designFee =
    pricing.designFeeAmount !== undefined
      ? pricing.designFeeAmount
      : Math.round(subtotal * 0.02);
  const transportCharges = pricing.transportCharges || 0;
  const discount = pricing.discountAmount || 0;
  const taxable =
    pricing.taxableAmount !== undefined
      ? pricing.taxableAmount
      : subtotal + handlingFee + designFee + transportCharges - discount;
  const totalGst =
    pricing.totalGstAmount !== undefined
      ? pricing.totalGstAmount
      : Math.round(taxable * 0.18);
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;
  const grandTotal =
    pricing.grandTotal !== undefined ? pricing.grandTotal : taxable + totalGst;
  const amountInWords = pricing.amountInWords || "";

  // ── Payment Milestones ─────────────────────────────────────────────────────
  const milestones = q.paymentMilestones || [];
  const milestonesHtml =
    milestones.length > 0
      ? `
      <div class="section-title">5. Payment Milestones</div>
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

  // ── Payment & Transaction History ─────────────────────────────────────────
  const txList = Array.isArray(q.transactions) ? q.transactions : [];

  // Calculate totals from actual database records
  let completedPaidAmount = 0;
  let pendingAmount = 0;
  let refundedAmount = 0;

  txList.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    const st = String(tx.status || "").toUpperCase();
    const type = String(tx.transactionType || "");
    if (st === "COMPLETED" || st === "PAID" || st === "SUCCESS") {
      if (type === "Refund") {
        refundedAmount += amt;
      } else {
        completedPaidAmount += amt;
      }
    } else if (st === "PENDING") {
      pendingAmount += amt;
    } else if (st === "REFUNDED") {
      refundedAmount += amt;
    }
  });

  const netPaidAmount = Math.max(0, completedPaidAmount - refundedAmount);
  const remainingAmount = Math.max(0, grandTotal - netPaidAmount);

  const paySummary = q.paymentSummary || {
    totalAmount: grandTotal,
    paidAmount: netPaidAmount,
    remainingAmount: remainingAmount,
    paymentStatus:
      netPaidAmount >= grandTotal && grandTotal > 0
        ? "PAID"
        : netPaidAmount > 0
          ? "PARTIALLY_PAID"
          : "UNPAID",
  };

  const paymentSummaryHtml = `
    <div class="section-title">6. Payment &amp; Transaction History</div>
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
          <td class="right font-bold" style="color: #7A131A;">${formatINR(paySummary.paidAmount)}</td>
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
            <th style="width: 4%;" class="center">#</th>
            <th style="width: 17%;">Transaction ID</th>
            <th style="width: 13%;">Date &amp; Time</th>
            <th style="width: 14%;">Type &amp; Method</th>
            <th style="width: 14%;">Ref / UTR</th>
            <th style="width: 14%;">Customer / Admin</th>
            <th style="width: 10%;" class="center">Status</th>
            <th class="right" style="width: 14%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${txList
            .map((tx, idx) => {
              const qRef =
                tx.quotationRef ||
                tx.quotationId?.quotationNumber ||
                (typeof tx.quotationId === "string" ? tx.quotationId : "") ||
                q.quotationNumber ||
                "";
              const invRef =
                tx.invoiceRef ||
                tx.invoiceId?.invoiceNumber ||
                (typeof tx.invoiceId === "string" ? tx.invoiceId : "");
              const cust =
                tx.customerName ||
                tx.customerId?.name ||
                q.client?.name ||
                "";
              const emp =
                tx.employeeName ||
                tx.employeeId?.name ||
                tx.adminName ||
                "";
              const notes = tx.description || tx.notes || "";
              const recordedBy = tx.createdByName || "";
              const st = tx.status || "Completed";
              const stUpper = String(st).toUpperCase();
              const badgeColor =
                stUpper === "COMPLETED" ||
                stUpper === "PAID" ||
                stUpper === "SUCCESS"
                  ? "#166534"
                  : stUpper === "PENDING"
                    ? "#B45309"
                    : stUpper === "REFUNDED"
                      ? "#7A131A"
                      : "#DC2626";

              return `
            <tr>
              <td class="center">${idx + 1}</td>
              <td>
                <strong>${escapeHtml(tx.transactionId || tx.referenceId || "TXN")}</strong>
                ${recordedBy ? `<div style="font-size: 7pt; color: #64748B;">By: ${escapeHtml(recordedBy)}</div>` : ""}
              </td>
              <td>${formatDateTime(tx.transactionDate || tx.createdAt)}</td>
              <td>
                <div style="font-weight: 600;">${escapeHtml(tx.transactionType || "Payment")}</div>
                <div style="font-size: 7.5pt; color: #64748B;">${escapeHtml(tx.paymentMethod || "UPI")}</div>
              </td>
              <td>
                <div>${escapeHtml(tx.referenceId || "—")}</div>
                ${qRef || invRef ? `<div style="font-size: 7pt; color: #64748B;">${qRef ? `Q: ${escapeHtml(qRef)}` : ""} ${invRef ? `Inv: ${escapeHtml(invRef)}` : ""}</div>` : ""}
              </td>
              <td>
                <div style="font-weight: 600; color: #0F172A;">${escapeHtml(cust || "—")}</div>
                ${emp ? `<div style="font-size: 7pt; color: #64748B;">Staff: ${escapeHtml(emp)}</div>` : ""}
                ${notes ? `<div style="font-size: 7pt; color: #64748B; font-style: italic;">${escapeHtml(notes)}</div>` : ""}
              </td>
              <td class="center" style="color: ${badgeColor}; font-weight: 700;">
                ${escapeHtml(st)}
              </td>
              <td class="right font-bold" style="color: ${tx.transactionType === "Refund" ? "#DC2626" : "#0F172A"};">
                ${tx.transactionType === "Refund" ? "-" : ""}${formatINR(tx.amount)}
              </td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>`
        : ""
    }
  `;

  // ── Bank Details ───────────────────────────────────────────────────────────
  const bank = q.bankDetails || {
    accountName: "Altera Interior",
    bankName: "IndusInd Bank Limited",
    accountNumber: "201002880175",
    ifscCode: "INDB0000518",
    branch: "Sector-31, Gurgaon Branch",
    bankAddress:
      "SCO-8, Sector 31/32A HUDA Market, Gurgaon – 122 002, Haryana, India",
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
      border-bottom: 2px solid #7A131A;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-logo {
      height: 62px;
      width: auto;
      max-width: 280px;
      object-fit: contain;
      margin-bottom: 6px;
      display: block;
    }
    .company-name {
      font-size: 14pt;
      font-weight: 800;
      color: #7A131A;
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
      color: #7A131A;
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
      border: 1px solid #7A131A;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #7A131A;
      background: #FFF5F5;
      border-radius: 4px;
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
      background: #FDF2F4;
      padding: 10px 12px;
      border-radius: 4px;
    }
    .info-card-title {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #7A131A;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #7A131A;
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
      color: #7A131A;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #7A131A;
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
      background: #7A131A;
      border: 1px solid #7A131A;
      border-bottom: none;
      padding: 6px 10px;
      font-size: 9.5pt;
      font-weight: 800;
      color: #FFFFFF;
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
      background: #FFF5F5;
      color: #7A131A;
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
      background: #FFF5F5;
      color: #7A131A;
      border-top: 2px solid #7A131A;
      font-weight: 800;
      font-size: 11pt;
      border-bottom: none;
    }

    /* ── Tables (Milestones, Transactions, Bank) ── */
    .standard-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      font-size: 8.5pt;
      margin-bottom: 14px;
      page-break-inside: auto;
    }
    .standard-table thead {
      display: table-header-group;
    }
    .standard-table tbody tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .standard-table th {
      background: #FFF5F5;
      color: #7A131A;
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
        <div class="doc-title"> QUOTATION</div>
        <div class="doc-meta">
          <strong>Quotation No:</strong> ${escapeHtml(quotationNumber)}${q.revision ? ` (Rev ${q.revision})` : ""}<br />
          <strong>Date:</strong> ${qDate}<br />
          <strong>Valid Until:</strong> ${vUntil}
        </div>
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
  <div class="section-title">3. Items / Scope of Work</div>
  ${roomSectionsHtml}

  <!-- 4. Standalone Accessories -->
  ${standaloneAccHtml}

  <!-- 4. Milestones -->
  ${milestonesHtml}

  <!-- 5. Cost Summary -->
  <div class="section-title">5. Cost Summary</div>
  <div class="summary-container">
    <table class="summary-table">
      <tr>
        <td>Items Subtotal:</td>
        <td class="right font-bold">${formatINR(subtotal)}</td>
      </tr>
      ${
        handlingFee > 0
          ? `
      <tr>
        <td>Handling Charges (${pricing.handlingFeePercent || 2}%):</td>
        <td class="right">${formatINR(handlingFee)}</td>
      </tr>`
          : ""
      }
      ${
        designFee > 0
          ? `
      <tr>
        <td>Designing / Consultation Fees (${pricing.designFeePercent || 2}%):</td>
        <td class="right">${formatINR(designFee)}</td>
      </tr>`
          : ""
      }
      ${
        transportCharges > 0
          ? `
      <tr>
        <td>Transport / Freight Charges:</td>
        <td class="right">${formatINR(transportCharges)}</td>
      </tr>`
          : ""
      }
      ${
        discount > 0
          ? `
      <tr>
        <td style="color: #7A131A;">Special Discount:</td>
        <td class="right" style="color: #7A131A;">-${formatINR(discount)}</td>
      </tr>`
          : ""
      }
      <tr style="border-top: 1px solid #CBD5E1;">
        <td class="font-bold">Subtotal / Taxable Amount:</td>
        <td class="right font-bold">${formatINR(taxable)}</td>
      </tr>
      ${
        pricing.gstType === "AS_PER_ACTUAL"
          ? `
      <tr>
        <td>GST (18%):</td>
        <td class="right" style="color: #7A131A; font-weight: 600;">As per Actuals</td>
      </tr>`
          : `
      <tr>
        <td>CGST (${(pricing.gstPercent || 18) / 2}%):</td>
        <td class="right">${formatINR(cgst)}</td>
      </tr>
      <tr>
        <td>SGST (${(pricing.gstPercent || 18) / 2}%):</td>
        <td class="right">${formatINR(sgst)}</td>
      </tr>`
      }
      <tr class="grand-row">
        <td>Estimated Grand Total:</td>
        <td class="right">${formatINR(grandTotal)}</td>
      </tr>
    </table>
  </div>
  ${
    amountInWords
      ? `<div style="font-size: 8.5pt; color: #334155; margin-bottom: 12px;"><strong>Amount in Words:</strong> ${escapeHtml(amountInWords)}</div>`
      : ""
  }
  ${
    pricing.gstType === "AS_PER_ACTUAL"
      ? `<div style="font-size: 8.5pt; color: #475569; margin-bottom: 12px;"><strong>Note:</strong> GST @ 18% will be charged separately as applicable on the actual/final invoice and is not included in this estimated total.</div>`
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

  <!-- Terms & Conditions -->
  ${
    terms && terms.length > 0
      ? `
  <div class="terms-block">
    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px; text-transform: uppercase;">Terms &amp; Conditions</div>
    ${terms.map((t) => `<div style="margin-bottom: 2px;">${escapeHtml(t)}</div>`).join("")}
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

export async function printQuotation(q) {
  let fullQuotation = q;
  if (
    q &&
    q._id &&
    (!Array.isArray(q.transactions) ||
      q.transactions.length === 0 ||
      !Array.isArray(q.rooms) ||
      q.rooms.length === 0)
  ) {
    try {
      const res = await api.get(`/quotations/${q._id}`);
      if (res.data?.success && res.data.quotation) {
        fullQuotation = {
          ...res.data.quotation,
          transactions:
            res.data.transactions || res.data.quotation.transactions || [],
          paymentSummary:
            res.data.paymentSummary || res.data.quotation.paymentSummary,
        };
      }
    } catch (e) {
      console.warn(
        "Could not fetch full quotation details, printing with existing data:",
        e
      );
    }
  }
  const html = buildQuotationHtml(fullQuotation);
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

export function buildTransactionRecordsReportHtml({
  transactions = [],
  summary = null,
  filters = {},
  companyDetails = null,
}) {
  const defaultCompany = {
    name: "ALTERA INTERIOR",
    tagline: "The Modern Home Maker • Interior | Architect | Construction",
    address:
      "Plot 16/2, Dhanwapur Village, Behind ATS Triumph Tower, Dwarka Expressway, Sec-104, Gurugram (HR)",
    phone: "+91 9718374407",
    email: "info@alterainterior.com",
    gstin: "06CFEPS8731P1Z0",
  };

  const company = companyDetails || defaultCompany;

  // Calculate totals from actual database records
  let totalCount = transactions.length;
  let completedAmount = 0;
  let pendingAmount = 0;
  let refundedAmount = 0;

  transactions.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    const st = String(tx.status || "").toUpperCase();
    const type = String(tx.transactionType || "");
    if (st === "COMPLETED" || st === "PAID" || st === "SUCCESS") {
      if (type === "Refund") {
        refundedAmount += amt;
      } else {
        completedAmount += amt;
      }
    } else if (st === "PENDING") {
      pendingAmount += amt;
    } else if (st === "REFUNDED") {
      refundedAmount += amt;
    }
  });

  const generatedDate = formatDateTime(new Date());

  const rowsHtml =
    transactions.length === 0
      ? `<tr><td colspan="8" class="center" style="padding: 24px; color: #64748B;">No transaction records found matching the criteria.</td></tr>`
      : transactions
          .map((tx, idx) => {
            const qRef =
              tx.quotationRef ||
              tx.quotationId?.quotationNumber ||
              (typeof tx.quotationId === "string" ? tx.quotationId : "");
            const invRef =
              tx.invoiceRef ||
              tx.invoiceId?.invoiceNumber ||
              (typeof tx.invoiceId === "string" ? tx.invoiceId : "");
            const cust =
              tx.customerName || tx.customerId?.name || "";
            const emp =
              tx.employeeName ||
              tx.employeeId?.name ||
              tx.adminName ||
              "";
            const party =
              cust && emp ? `${cust} • ${emp}` : cust || emp || "—";
            const notes = tx.description || tx.notes || "";
            const recordedBy = tx.createdByName || "";
            const st = tx.status || "Completed";
            const stUpper = String(st).toUpperCase();
            const badgeColor =
              stUpper === "COMPLETED" ||
              stUpper === "PAID" ||
              stUpper === "SUCCESS"
                ? "#166534"
                : stUpper === "PENDING"
                  ? "#B45309"
                  : stUpper === "REFUNDED"
                    ? "#7A131A"
                    : "#DC2626";

            return `
          <tr>
            <td class="center">${idx + 1}</td>
            <td>
              <strong>${escapeHtml(tx.transactionId || tx.referenceId || "TXN")}</strong>
              ${recordedBy ? `<div style="font-size: 7pt; color: #64748B;">Recorded By: ${escapeHtml(recordedBy)}</div>` : ""}
            </td>
            <td>${formatDateTime(tx.transactionDate || tx.createdAt)}</td>
            <td>
              <div style="font-weight: 700; color: #0F172A;">${escapeHtml(cust || "—")}</div>
              ${emp ? `<div style="font-size: 7pt; color: #64748B;">Staff: ${escapeHtml(emp)}</div>` : ""}
            </td>
            <td>
              ${qRef ? `<div><strong style="color: #7A131A;">Q:</strong> ${escapeHtml(qRef)}</div>` : ""}
              ${invRef ? `<div><strong style="color: #0F172A;">Inv:</strong> ${escapeHtml(invRef)}</div>` : ""}
              ${!qRef && !invRef ? `<div style="color: #64748B;">—</div>` : ""}
            </td>
            <td>
              <div style="font-weight: 600;">${escapeHtml(tx.transactionType || "Payment")}</div>
              <div style="font-size: 7.5pt; color: #64748B;">${escapeHtml(tx.paymentMethod || "UPI")}${tx.referenceId ? ` &bull; Ref: ${escapeHtml(tx.referenceId)}` : ""}</div>
              ${notes ? `<div style="font-size: 7pt; color: #64748B; font-style: italic;">${escapeHtml(notes)}</div>` : ""}
            </td>
            <td class="center" style="color: ${badgeColor}; font-weight: 700;">
              ${escapeHtml(st)}
            </td>
            <td class="right font-bold" style="color: ${tx.transactionType === "Refund" ? "#DC2626" : "#0F172A"};">
              ${tx.transactionType === "Refund" ? "-" : ""}${formatINR(tx.amount)}
            </td>
          </tr>
        `;
          })
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Transaction_Records_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9pt;
      color: #1E293B;
      background: #FFFFFF;
      line-height: 1.4;
      padding: 10px 0;
    }

    /* ── Header ── */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #7A131A;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-logo {
      height: 60px;
      width: auto;
      max-width: 260px;
      object-fit: contain;
      margin-bottom: 6px;
      display: block;
    }
    .company-name {
      font-size: 14pt;
      font-weight: 800;
      color: #7A131A;
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
      font-size: 15pt;
      font-weight: 800;
      color: #7A131A;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 8.5pt;
      color: #334155;
      margin-top: 4px;
      line-height: 1.4;
    }

    /* ── Filters Bar ── */
    .filter-bar {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 8.5pt;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      page-break-inside: avoid;
    }

    /* ── Metric Cards ── */
    .metric-grid {
      display: table;
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .metric-card {
      display: table-cell;
      width: 25%;
      background: #FFF5F5;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 8px 10px;
      vertical-align: top;
    }
    .metric-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #7A131A;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .metric-value {
      font-size: 13pt;
      font-weight: 800;
      color: #0F172A;
      margin-top: 3px;
    }

    /* ── Section Title ── */
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #7A131A;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #7A131A;
      padding-bottom: 3px;
      margin-top: 14px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    /* ── Multi-page Standard Table ── */
    .standard-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      font-size: 8pt;
      margin-bottom: 14px;
      page-break-inside: auto;
    }
    .standard-table thead {
      display: table-header-group;
    }
    .standard-table th {
      background: #FFF5F5;
      color: #7A131A;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
      border-right: 1px solid #E2E8F0;
    }
    .standard-table th:last-child {
      border-right: none;
    }
    .standard-table tbody tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .standard-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
      color: #1E293B;
      vertical-align: top;
    }
    .standard-table td:last-child {
      border-right: none;
    }
    .standard-table tr:nth-child(even) {
      background: #FAFAFA;
    }

    /* ── Signature Section ── */
    .signature-table {
      width: 100%;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      vertical-align: bottom;
    }
    .signature-line {
      margin-top: 36px;
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

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
      tr {
        page-break-inside: avoid;
      }
    }
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
        <div class="doc-title">TRANSACTION RECORDS</div>
        <div class="doc-meta">
          <strong>Generated:</strong> ${generatedDate}<br />
          <strong>Period / Scope:</strong> ${escapeHtml(filters.dateRange || "All Dates")}<br />
          <strong>Total Records:</strong> ${totalCount}
        </div>
      </td>
    </tr>
  </table>

  <!-- Filter & Criteria Details -->
  <div class="filter-bar">
    <div><strong>Filter Criteria:</strong> Date: ${escapeHtml(filters.dateRange || "All")} ${filters.startDate ? `(${escapeHtml(filters.startDate)} to ${escapeHtml(filters.endDate)})` : ""} &bull; Type: ${escapeHtml(filters.transactionType || "All")} &bull; Method: ${escapeHtml(filters.paymentMethod || "All")} &bull; Status: ${escapeHtml(filters.statusFilter || "All")}</div>
    <div><strong>Records Matched:</strong> ${totalCount}</div>
  </div>

  <!-- Metric Cards -->
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Total Transactions</div>
      <div class="metric-value">${totalCount}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Completed (Paid)</div>
      <div class="metric-value" style="color: #166534;">${formatINR(summary?.totalAmount !== undefined ? summary.totalAmount : completedAmount)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Pending Amount</div>
      <div class="metric-value" style="color: #B45309;">${formatINR(summary?.pendingAmount !== undefined ? summary.pendingAmount : pendingAmount)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Refunded Amount</div>
      <div class="metric-value" style="color: #7A131A;">${formatINR(summary?.refundedAmount !== undefined ? summary.refundedAmount : refundedAmount)}</div>
    </div>
  </div>

  <!-- Section Title -->
  <div class="section-title">Official Transaction Ledger &amp; Audit Records</div>

  <!-- Multi-page Transaction Table -->
  <table class="standard-table">
    <thead>
      <tr>
        <th style="width: 3%;" class="center">#</th>
        <th style="width: 15%;">Transaction ID</th>
        <th style="width: 12%;">Date &amp; Time</th>
        <th style="width: 15%;">Customer Name</th>
        <th style="width: 15%;">Quotation / Invoice Ref</th>
        <th style="width: 15%;">Payment Details</th>
        <th style="width: 10%;" class="center">Status</th>
        <th class="right" style="width: 15%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <!-- Signature Section -->
  <table class="signature-table">
    <tr>
      <td style="width: 60%; vertical-align: bottom; font-size: 8pt; color: #64748B;">
        This document is an authentic financial audit record generated by Altera Interior CRM.<br />
        All entries are logged with verified reference IDs and timestamp audits.
      </td>
      <td class="signature-box" style="width: 40%; text-align: right;">
        <div class="signature-line" style="margin-left: auto;">For ${escapeHtml(company.name)}</div>
        <div class="signature-sub">Authorized Signatory</div>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function printTransactionRecordsReport(options) {
  const html = buildTransactionRecordsReportHtml(options);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert("Please allow popups in your browser to view and download the Transaction Records PDF.");
  }
}
