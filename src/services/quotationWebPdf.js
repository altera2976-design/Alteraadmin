/**
 * quotationWebPdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional Web PDF & Print Generator for Altera Interior & Architecture Quotations.
 * Generates branded multi-page printable document matching corporate standards.
 */

export function formatINR(v) {
  if (v === undefined || v === null || isNaN(v)) return '₹0';
  return '₹' + Math.round(Number(v)).toLocaleString('en-IN');
}

export function formatDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function utf8ToBase64(str) {
  if (!str) return '';
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function buildQuotationHtml(q) {
  const company = q.companyDetails || {
    name: 'ALTERA INTERIOR',
    tagline: 'The Modern Home Maker • Interior | Architect | Construction',
    address: 'Plot 42, Sector 18, Commercial Hub, New Delhi - 110001',
    phone: '+91 98765 43210',
    email: 'contact@alterainterior.com',
    gstin: '07AAAAA0000A1Z5',
  };

  const client = q.client || {
    name: q.customerName || 'Valued Client',
    company: '',
    phone: q.customerPhone || '',
    email: q.customerEmail || '',
    address: q.customerAddress || q.siteLocation || '',
    gstin: '',
  };

  const quotationNumber = q.quotationNumber || q.quotationNo || 'QT-2026-0001';
  const qDate = formatDate(q.quotationDate || q.createdAt || new Date());
  const vUntil = formatDate(q.validUntil || new Date(Date.now() + 30 * 86400000));
  const status = (q.status || 'Draft').toUpperCase();

  // Group Items by Room / Area
  const roomGroups = {};
  if (Array.isArray(q.items) && q.items.length > 0) {
    q.items.forEach((item) => {
      const room = item.room || 'General Works';
      if (!roomGroups[room]) roomGroups[room] = [];
      roomGroups[room].push(item);
    });
  } else {
    roomGroups['General Scope'] = [];
  }

  let globalItemIndex = 0;
  let computedSubtotal = 0;

  const roomSectionsHtml = Object.keys(roomGroups)
    .map((roomName) => {
      const items = roomGroups[roomName];
      const roomTotal = items.reduce((acc, it) => acc + (it.amount || (it.quantity || 1) * (it.rate || 0)), 0);
      computedSubtotal += roomTotal;

      const itemRows = items
        .map((it) => {
          globalItemIndex++;
          const amt = it.amount !== undefined ? it.amount : (it.quantity || 1) * (it.rate || 0);

          const specs = it.specifications || {};
          const specEntries = Object.entries(specs).filter(([_, v]) => Boolean(v));
          const specsHtml =
            specEntries.length > 0
              ? `<div class="specs-grid">
                  ${specEntries
                    .map(([k, v]) => `<span class="spec-chip"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</span>`)
                    .join('')}
                </div>`
              : '';

          const accs = it.accessories || [];
          const accsHtml =
            accs.length > 0
              ? `<div class="acc-box">
                  <strong>Accessories:</strong> ${accs
                    .map((a) => `${escapeHtml(a.name)} (${a.qty} nos - ${escapeHtml(a.inclusionType)})`)
                    .join('; ')}
                </div>`
              : '';

          const m = it.measurements;
          const dimInfo =
            m && m.length > 0 && (m.height > 0 || m.width > 0)
              ? `<div class="dim-tag">📏 ${m.length} × ${m.height || m.width} = ${m.calculatedArea} ${it.unit}</div>`
              : '';

          return `
            <tr class="item-tr">
              <td class="center col-num">${globalItemIndex}</td>
              <td class="col-desc">
                <div class="item-title">${escapeHtml(it.name)}</div>
                ${it.description ? `<div class="item-subdesc">${escapeHtml(it.description)}</div>` : ''}
                ${dimInfo}
                ${specsHtml}
                ${accsHtml}
                ${it.remarks ? `<div class="item-remark">Note: ${escapeHtml(it.remarks)}</div>` : ''}
              </td>
              <td class="center col-unit">${escapeHtml(it.unit || 'Nos')}</td>
              <td class="center col-qty">${it.quantity || 1}</td>
              <td class="right col-rate">${formatINR(it.rate || 0)}</td>
              <td class="right col-amt">${formatINR(amt)}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="room-group">
          <div class="room-header">
            <div class="room-title">📍 ${escapeHtml(roomName.toUpperCase())}</div>
            <div class="room-subtotal">Area Subtotal: ${formatINR(roomTotal)}</div>
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
    .join('');

  // Financial calculations
  const p = q.pricing || {};
  const subtotal = p.subtotal || computedSubtotal;
  const handlingAmt = p.handlingFeeAmount || 0;
  const designAmt = p.designFeeAmount || 0;
  const discountAmt = p.discountAmount || 0;
  const taxable = p.taxableAmount || subtotal + handlingAmt + designAmt - discountAmt;
  const gstAmt = p.totalGstAmount || 0;
  const grandTotal = p.grandTotal || taxable + gstAmt;

  // Payment milestones
  const milestones = q.paymentMilestones || [];
  const milestonesHtml =
    milestones.length > 0
      ? milestones
          .map((m, idx) => {
            const mAmt = m.amount || (grandTotal * (m.percentage || 0)) / 100;
            return `
              <tr>
                <td class="center">${idx + 1}</td>
                <td><strong>${escapeHtml(m.milestoneName)}</strong></td>
                <td>${escapeHtml(m.stage || 'Stage Milestone')}</td>
                <td class="center font-bold">${m.percentage}%</td>
                <td class="right font-bold">${formatINR(mAmt)}</td>
              </tr>
            `;
          })
          .join('')
      : '<tr><td colspan="5" class="center">Standard payment terms apply (10% token, 50% mobilization, 40% handover).</td></tr>';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Quotation_${quotationNumber}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 30px; font-size: 13px; line-height: 1.4; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
          .brand-title { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
          .brand-sub { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
          .doc-type { font-size: 20px; font-weight: 900; color: #0f172a; text-align: right; }
          .doc-no { font-size: 13px; font-weight: 700; color: #475569; text-align: right; margin-top: 4px; }
          .info-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
          .info-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
          .box-head { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .room-group { margin-bottom: 20px; }
          .room-header { background: #0f172a; color: #ffffff; padding: 8px 12px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; }
          .room-title { font-size: 12px; font-weight: 800; letter-spacing: 0.5px; }
          .room-subtotal { font-size: 12px; font-weight: 700; }
          .item-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-top: none; }
          .item-table th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          .item-tr { border-bottom: 1px solid #e2e8f0; }
          .item-tr td { padding: 8px 10px; vertical-align: top; }
          .item-title { font-weight: 700; color: #0f172a; font-size: 13px; }
          .item-subdesc { font-size: 11px; color: #475569; margin-top: 2px; }
          .spec-chip { display: inline-block; background: #e2e8f0; color: #0f172a; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; margin-top: 4px; }
          .dim-tag { font-size: 11px; color: #0f172a; font-weight: 700; margin-top: 3px; }
          .center { text-align: center; }
          .right { text-align: right; }
          .summary-container { display: flex; justify-content: space-between; gap: 20px; margin-top: 24px; }
          .milestones-table { width: 60%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; }
          .milestones-table th { background: #f1f5f9; font-size: 11px; padding: 6px 10px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          .milestones-table td { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .pricing-table { width: 36%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; }
          .pricing-table td { padding: 6px 10px; font-size: 12px; }
          .grand-row { background: #0f172a; color: #ffffff; font-weight: 800; font-size: 14px; }
          .grand-row td { padding: 8px 10px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
          .sig-box { text-align: center; width: 200px; }
          .sig-line { border-top: 1px dashed #0f172a; margin-top: 40px; margin-bottom: 6px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="brand-title">${escapeHtml(company.name)}</div>
              <div class="brand-sub">${escapeHtml(company.tagline)}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                📍 ${escapeHtml(company.address)} | 📞 ${escapeHtml(company.phone)} | ✉️ ${escapeHtml(company.email)}<br/>
                GSTIN: <strong>${escapeHtml(company.gstin)}</strong>
              </div>
            </td>
            <td style="vertical-align: top;">
              <div class="doc-type">OFFICIAL QUOTATION</div>
              <div class="doc-no"># ${escapeHtml(quotationNumber)} (Rev ${q.revision || 0})</div>
              <div style="font-size: 11px; color: #64748b; text-align: right; margin-top: 4px;">
                Date: <strong>${qDate}</strong> | Valid Until: <strong>${vUntil}</strong>
              </div>
            </td>
          </tr>
        </table>

        <div class="info-grid">
          <div class="info-box">
            <div class="box-head">Client Information</div>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${escapeHtml(client.name)}</div>
            ${client.company ? `<div style="font-size: 12px; color: #475569;">${escapeHtml(client.company)}</div>` : ''}
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              📞 ${escapeHtml(client.phone || '—')} | ✉️ ${escapeHtml(client.email || '—')}<br/>
              ${client.gstin ? `GSTIN: ${escapeHtml(client.gstin)}` : ''}
            </div>
          </div>
          <div class="info-box">
            <div class="box-head">Project &amp; Site Details</div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${escapeHtml(q.projectTitle || 'Interior Execution')}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              <strong>Type:</strong> ${escapeHtml(q.projectType || 'Residential Interior')}<br/>
              <strong>Site Location:</strong> ${escapeHtml(q.siteLocation || client.address || '—')}
            </div>
          </div>
        </div>

        ${roomSectionsHtml}

        <div class="summary-container">
          <table class="milestones-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Milestone</th>
                <th>Stage Description</th>
                <th class="center">%</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${milestonesHtml}
            </tbody>
          </table>

          <table class="pricing-table">
            <tr>
              <td>Items Subtotal:</td>
              <td class="right font-bold">${formatINR(subtotal)}</td>
            </tr>
            ${handlingAmt > 0 ? `<tr><td>Handling Charges (${p.handlingFeePercent || 2}%):</td><td class="right">${formatINR(handlingAmt)}</td></tr>` : ''}
            ${designAmt > 0 ? `<tr><td>Designing Fees (${p.designFeePercent || 2}%):</td><td class="right">${formatINR(designAmt)}</td></tr>` : ''}
            ${discountAmt > 0 ? `<tr><td style="color: #059669;">Special Discount:</td><td class="right" style="color: #059669;">-${formatINR(discountAmt)}</td></tr>` : ''}
            <tr style="border-top: 1px solid #cbd5e1;">
              <td>Taxable Total:</td>
              <td class="right font-bold">${formatINR(taxable)}</td>
            </tr>
            <tr>
              <td>GST (${p.gstPercent || 18}%):</td>
              <td class="right">${formatINR(gstAmt)}</td>
            </tr>
            <tr class="grand-row">
              <td>Grand Total:</td>
              <td class="right">${formatINR(grandTotal)}</td>
            </tr>
          </table>
        </div>

        ${q.notes ? `<div style="margin-top: 20px; padding: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px;"><strong>Notes / Terms:</strong> ${escapeHtml(q.notes)}</div>` : ''}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-size: 11px; font-weight: 700;">Client Acceptance Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-size: 11px; font-weight: 700;">Authorized Signatory (${escapeHtml(company.name)})</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function printQuotation(q) {
  const html = buildQuotationHtml(q);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert('Please allow popups to view and print the PDF.');
  }
}
