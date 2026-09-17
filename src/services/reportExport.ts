import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export function formatINR(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '₹0';
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  return `${isNeg ? '-' : ''}₹${absVal.toLocaleString('en-IN')}`;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds professional branded HTML for PDF export
 */
export function buildReportHtml(
  type: string,
  period: string,
  summary: Record<string, any>,
  items: any[],
  filterInfo?: string
): string {
  const title = `${type.toUpperCase()} REPORT`;
  const generatedAt = new Date().toLocaleString('en-IN');

  // Build Summary KPI cards
  const summaryEntries = Object.entries(summary);
  const summaryCardsHtml = summaryEntries.map(([key, val]) => {
    const formattedKey = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
    const isCurrency = typeof val === 'number' && (key.toLowerCase().includes('budget') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('salary') || key.toLowerCase().includes('inflow') || key.toLowerCase().includes('outflow') || key.toLowerCase().includes('cashflow') || key.toLowerCase().includes('value'));
    const displayVal = isCurrency ? formatINR(val) : String(val);

    return `
      <div class="kpi-card">
        <div class="kpi-label">${escapeHtml(formattedKey)}</div>
        <div class="kpi-value">${escapeHtml(displayVal)}</div>
      </div>
    `;
  }).join('');

  // Build Table Columns & Rows based on report type
  let headers: string[] = [];
  let rowsHtml = '';

  switch (type.toLowerCase()) {
    case 'project': {
      headers = ['#', 'Project Name', 'Client', 'Status', 'Start Date', 'Deadline', 'Budget', 'Progress', 'Team'];
      rowsHtml = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight:600;color:#111;">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.client)}</td>
          <td><span class="badge badge-${escapeHtml(item.status.toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(item.startDate)}</td>
          <td>${escapeHtml(item.deadline)}</td>
          <td style="font-weight:700;color:#7A131A;">${formatINR(item.budget)}</td>
          <td>${escapeHtml(item.progress)}%</td>
          <td>${escapeHtml(item.assignedTeam)}</td>
        </tr>
      `).join('');
      break;
    }

    case 'sales': {
      headers = ['#', 'Name', 'Company', 'Phone', 'Email', 'Type', 'Status', 'Date', 'Pipeline Value'];
      rowsHtml = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight:600;color:#111;">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.company)}</td>
          <td>${escapeHtml(item.phone)}</td>
          <td>${escapeHtml(item.email)}</td>
          <td><span class="badge ${item.type === 'Client' ? 'badge-completed' : 'badge-planning'}">${escapeHtml(item.type)}</span></td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(item.date)}</td>
          <td style="font-weight:700;color:#7A131A;">${formatINR(item.orderValue)}</td>
        </tr>
      `).join('');
      break;
    }

    case 'employee': {
      headers = ['#', 'Employee ID', 'Name', 'Department', 'Designation', 'Status', 'Salary', 'Present Days'];
      rowsHtml = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-family:monospace;font-weight:600;color:#7A131A;">${escapeHtml(item.employeeId)}</td>
          <td style="font-weight:600;color:#111;">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.department)}</td>
          <td>${escapeHtml(item.designation)}</td>
          <td><span class="badge ${item.status === 'ACTIVE' ? 'badge-completed' : 'badge-inactive'}">${escapeHtml(item.status)}</span></td>
          <td style="font-weight:700;">${formatINR(item.salary)}</td>
          <td>${escapeHtml(item.presentDays || 0)} days</td>
        </tr>
      `).join('');
      break;
    }

    case 'attendance': {
      headers = ['#', 'Date', 'Employee', 'Employee ID', 'Department', 'Status', 'Check In', 'Check Out', 'Location', 'Verification'];
      rowsHtml = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight:600;">${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.employeeName)}</td>
          <td style="font-family:monospace;">${escapeHtml(item.employeeId)}</td>
          <td>${escapeHtml(item.department)}</td>
          <td><span class="badge badge-${escapeHtml(item.status.toLowerCase())}">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(item.checkIn)}</td>
          <td>${escapeHtml(item.checkOut)}</td>
          <td>${escapeHtml(item.location)}</td>
          <td><span class="badge ${item.verificationStatus === 'VERIFIED' ? 'badge-completed' : 'badge-planning'}">${escapeHtml(item.verificationStatus || 'REVIEW_REQUIRED')}</span></td>
        </tr>
      `).join('');
      break;
    }

    case 'payment': {
      headers = ['#', 'Reference', 'Title', 'Party', 'Type', 'Amount', 'Date', 'Status'];
      rowsHtml = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-family:monospace;font-weight:600;">${escapeHtml(item.referenceId)}</td>
          <td style="font-weight:600;color:#111;">${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.party)}</td>
          <td><span class="badge ${item.type === 'Income' ? 'badge-completed' : 'badge-inactive'}">${escapeHtml(item.type)}</span></td>
          <td style="font-weight:700;color:${item.amount >= 0 ? '#10B981' : '#D60000'};">${formatINR(item.amount)}</td>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.status)}</td>
        </tr>
      `).join('');
      break;
    }

    default:
      headers = ['Item', 'Details'];
      rowsHtml = `<tr><td colspan="2">No records found.</td></tr>`;
  }

  const thHtml = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)} - ${escapeHtml(period)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #2D3748;
          background: #ffffff;
          padding: 30px;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #7A131A;
          padding-bottom: 18px;
          margin-bottom: 24px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #7A131A;
          letter-spacing: 1px;
        }
        .brand-sub {
          font-size: 12px;
          color: #718096;
          margin-top: 3px;
        }
        .meta-box {
          text-align: right;
        }
        .meta-title {
          font-size: 16px;
          font-weight: 700;
          color: #1A202C;
        }
        .meta-period {
          font-size: 13px;
          color: #7A131A;
          font-weight: 600;
          margin-top: 4px;
        }
        .meta-time {
          font-size: 11px;
          color: #A0AEC0;
          margin-top: 2px;
        }

        .filter-banner {
          background: #F7FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 11px;
          color: #4A5568;
          margin-bottom: 20px;
        }

        .kpi-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-card {
          flex: 1;
          min-width: 120px;
          background: #FFF5F5;
          border: 1px solid #FEB2B2;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .kpi-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #7A131A;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 16px;
          font-weight: 800;
          color: #1A202C;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th {
          background-color: #7A131A;
          color: #ffffff;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          padding: 10px 8px;
          text-align: left;
          border: 1px solid #7A131A;
        }
        td {
          padding: 8px;
          border: 1px solid #E2E8F0;
          font-size: 11px;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background-color: #F8FAFC;
        }

        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }
        .badge-completed, .badge-present, .badge-paid {
          background-color: #DEF7EC;
          color: #03543F;
        }
        .badge-in-progress, .badge-late {
          background-color: #FEF08A;
          color: #854D0E;
        }
        .badge-planning, .badge-leave {
          background-color: #E1EFFE;
          color: #1E429F;
        }
        .badge-inactive, .badge-absent {
          background-color: #FDE8E8;
          color: #9B1C1C;
        }

        .footer {
          margin-top: 36px;
          border-top: 1px solid #E2E8F0;
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #A0AEC0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">ALTERA INTERIOR</div>
          <div class="brand-sub">The Modern Home Maker • Management Reports</div>
        </div>
        <div class="meta-box">
          <div class="meta-title">${escapeHtml(title)}</div>
          <div class="meta-period">${escapeHtml(period)}</div>
          <div class="meta-time">Generated: ${escapeHtml(generatedAt)}</div>
        </div>
      </div>

      ${filterInfo ? `<div class="filter-banner"><strong>Active Filters:</strong> ${escapeHtml(filterInfo)}</div>` : ''}

      <div class="kpi-grid">
        ${summaryCardsHtml}
      </div>

      <table>
        <thead>
          <tr>${thHtml}</tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="${headers.length}" style="text-align:center;padding:24px;color:#999;">No records found matching criteria.</td></tr>`}
        </tbody>
      </table>

      <div class="footer">
        <span>Confidential • For internal company use only</span>
        <span>Generated via Altera Interior EMS System</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate PDF file on device
 */
export async function generatePdf(
  type: string,
  period: string,
  summary: Record<string, any>,
  items: any[],
  filterInfo?: string
): Promise<{ uri: string; base64: string; filename: string }> {
  const html = buildReportHtml(type, period, summary, items, filterInfo);
  const cleanPeriod = period.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${type}_Report_${cleanPeriod}.pdf`;

  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const destUri = baseDir ? `${baseDir}${filename}` : uri;
  if (base64 && baseDir) {
    try {
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // Fallback to original uri
    }
  }

  return { uri: destUri, base64: base64 ?? '', filename };
}

/**
 * Universal UTF-8 string to Base64 encoder for React Native / web
 */
export function stringToBase64(str: string): string {
  if (typeof btoa === 'function') {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      // fallback to manual encoding
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const utf8Str = unescape(encodeURIComponent(str));
  for (let i = 0; i < utf8Str.length; i += 3) {
    const c1 = utf8Str.charCodeAt(i);
    const c2 = utf8Str.charCodeAt(i + 1);
    const c3 = utf8Str.charCodeAt(i + 2);
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = isNaN(c2) ? 64 : (((c2 & 15) << 2) | (c3 >> 6));
    const e4 = isNaN(c2) || isNaN(c3) ? 64 : (c3 & 63);
    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
}

/**
 * Download / Share PDF
 */
export async function downloadReportPdf(
  type: string,
  period: string,
  summary: Record<string, any>,
  items: any[],
  filterInfo?: string
): Promise<void> {
  const { uri, filename } = await generatePdf(type, period, summary, items, filterInfo);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Download ${filename}`,
    });
  }
}

/**
 * Builds CSV content with UTF-8 BOM for Microsoft Excel compatibility
 */
export function buildReportCsv(
  type: string,
  period: string,
  items: any[]
): string {
  const cleanPeriod = period.replace(/[^a-zA-Z0-9]/g, '_');
  let csv = '\uFEFF'; // UTF-8 Byte Order Mark for Excel

  // Title header
  csv += `"Altera Interior - ${type.toUpperCase()} REPORT"\n`;
  csv += `"Period: ${period}"\n`;
  csv += `"Generated: ${new Date().toLocaleString('en-IN')}"\n\n`;

  if (!items || items.length === 0) {
    csv += `"No records found"\n`;
    return csv;
  }

  // Extract columns
  const first = items[0];
  const keys = Object.keys(first).filter(k => k !== '_id' && k !== 'id');

  // Format headers
  const headerRow = keys.map(k => `"${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}"`).join(',');
  csv += headerRow + '\n';

  // Format rows
  items.forEach(item => {
    const row = keys.map(k => {
      const val = item[k];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
    csv += row + '\n';
  });

  return csv;
}

/**
 * Download / Share Excel/CSV file
 */
export async function downloadReportCsv(
  type: string,
  period: string,
  items: any[]
): Promise<void> {
  const csvContent = buildReportCsv(type, period, items);
  const cleanPeriod = period.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${type}_Report_${cleanPeriod}.csv`;
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const destUri = `${baseDir}${filename}`;

  await FileSystem.writeAsStringAsync(destUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: `Download ${filename}`,
    });
  }
}
