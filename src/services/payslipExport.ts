import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { PayrollRecord } from './payrollService';
import { COMPANY_LOGO_DATA_URL } from '../constants/companyLogo';

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
 * Builds professional branded HTML for Payslip PDF export
 */
export function buildPayslipHtml(payroll: PayrollRecord, emp: any): string {
  const earnings = payroll.earnings || {
    basic: 0,
    hra: 0,
    allowances: 0,
    bonus: 0,
    overtimeRate: 200,
    overtimeAmount: 0,
    otherEarnings: 0,
    grossSalary: 0,
  };

  const deductions = payroll.deductions || {
    unpaidLeaveDeduction: 0,
    halfDayDeduction: 0,
    pf: 0,
    esi: 0,
    profTax: 0,
    tds: 0,
    otherDeductions: 0,
    totalDeductions: 0,
  };

  const att = payroll.attendanceSummary || {
    totalCalendarDays: 30,
    workingDays: 26,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    paidLeave: 0,
    unpaidLeave: 0,
    holidays: 0,
    weekOffs: 0,
    lateDays: 0,
    overtimeHours: 0,
  };

  const payment = payroll.payment || {
    paymentStatus: 'PENDING',
    paymentMethod: 'PENDING',
    transactionId: '',
  };

  const empName = emp?.name || payroll.employee?.name || 'Employee';
  const empId = emp?.employeeId || payroll.employee?.employeeId || '—';
  const dept = emp?.department || payroll.employee?.department || 'General';
  const desig = emp?.designation || payroll.employee?.designation || 'Staff';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Payslip_${escapeHtml(empName)}_${escapeHtml(payroll.month)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #2D3748;
          background: #ffffff;
          padding: 36px;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #7A131A;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #7A131A;
          letter-spacing: 1px;
        }
        .brand-sub {
          font-size: 11px;
          color: #718096;
          margin-top: 3px;
        }
        .meta-box {
          text-align: right;
        }
        .meta-title {
          font-size: 18px;
          font-weight: 700;
          color: #1A202C;
        }
        .meta-period {
          font-size: 13px;
          color: #7A131A;
          font-weight: 700;
          margin-top: 4px;
        }
        .meta-time {
          font-size: 10px;
          color: #A0AEC0;
          margin-top: 2px;
        }

        .emp-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }
        .emp-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px 24px;
        }
        .emp-item {
          flex: 1;
          min-width: 140px;
        }
        .emp-label {
          font-size: 10px;
          color: #64748B;
          text-transform: uppercase;
          font-weight: 600;
        }
        .emp-val {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin-top: 2px;
        }

        .att-summary-box {
          background: #FFF5F5;
          border: 1px solid #FEB2B2;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-around;
          text-align: center;
        }
        .att-item-val {
          font-size: 15px;
          font-weight: 800;
          color: #7A131A;
        }
        .att-item-lbl {
          font-size: 10px;
          color: #718096;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .salary-table-wrap {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }
        .salary-col {
          flex: 1;
        }
        .col-header {
          background: #F1F5F9;
          border-top: 2px solid #7A131A;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td {
          padding: 8px 12px;
          border-bottom: 1px solid #E2E8F0;
          font-size: 11px;
        }
        .amount-col {
          text-align: right;
          font-weight: 600;
        }
        .subtotal-row td {
          font-weight: 700;
          background: #F8FAFC;
          color: #0F172A;
          border-top: 1px solid #CBD5E1;
        }

        .net-pay-banner {
          background: #0F172A;
          color: #ffffff;
          border-radius: 10px;
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .net-pay-title {
          font-size: 14px;
          font-weight: 600;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .net-pay-val {
          font-size: 26px;
          font-weight: 800;
          color: #10B981;
        }

        .payment-info {
          display: flex;
          justify-content: space-between;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 10px 16px;
          margin-bottom: 30px;
          font-size: 11px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 10px;
        }
        .badge-paid { background: #DEF7EC; color: #03543F; }
        .badge-pending { background: #FEF3C7; color: #92400E; }

        .footer {
          border-top: 1px solid #E2E8F0;
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          color: #94A3B8;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <img src="${COMPANY_LOGO_DATA_URL}" alt="Altera Interior Logo" style="height: 48px; width: auto; max-width: 260px; object-fit: contain; margin-bottom: 4px; display: block;" />
          <div class="brand-sub">The Modern Home Maker • Corporate Payroll</div>
        </div>
        <div class="meta-box">
          <div class="meta-title">SALARY PAYSLIP</div>
          <div class="meta-period">${escapeHtml(payroll.month)}</div>
          <div class="meta-time">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div class="emp-card">
        <div class="emp-grid">
          <div class="emp-item">
            <div class="emp-label">Employee Name</div>
            <div class="emp-val">${escapeHtml(empName)}</div>
          </div>
          <div class="emp-item">
            <div class="emp-label">Employee ID</div>
            <div class="emp-val" style="font-family: monospace;">${escapeHtml(empId)}</div>
          </div>
          <div class="emp-item">
            <div class="emp-label">Department</div>
            <div class="emp-val">${escapeHtml(dept)}</div>
          </div>
          <div class="emp-item">
            <div class="emp-label">Designation</div>
            <div class="emp-val">${escapeHtml(desig)}</div>
          </div>
        </div>
      </div>

      <div class="att-summary-box">
        <div>
          <div class="att-item-val">${att.totalCalendarDays}</div>
          <div class="att-item-lbl">Total Days</div>
        </div>
        <div>
          <div class="att-item-val" style="color:#10B981;">${att.presentDays}</div>
          <div class="att-item-lbl">Present Days</div>
        </div>
        <div>
          <div class="att-item-val" style="color:#F59E0B;">${att.halfDays}</div>
          <div class="att-item-lbl">Half Days</div>
        </div>
        <div>
          <div class="att-item-val" style="color:#EF4444;">${att.unpaidLeave}</div>
          <div class="att-item-lbl">Unpaid Absences</div>
        </div>
        <div>
          <div class="att-item-val" style="color:#3B82F6;">${att.paidLeave}</div>
          <div class="att-item-lbl">Paid Leave</div>
        </div>
        <div>
          <div class="att-item-val">${att.overtimeHours} hrs</div>
          <div class="att-item-lbl">Overtime</div>
        </div>
      </div>

      <div class="salary-table-wrap">
        <!-- Earnings -->
        <div class="salary-col">
          <div class="col-header">Earnings</div>
          <table>
            <tr>
              <td>Basic Salary</td>
              <td class="amount-col">${formatINR(earnings.basic)}</td>
            </tr>
            <tr>
              <td>House Rent Allowance (HRA)</td>
              <td class="amount-col">${formatINR(earnings.hra)}</td>
            </tr>
            <tr>
              <td>Special & Travel Allowances</td>
              <td class="amount-col">${formatINR(earnings.allowances)}</td>
            </tr>
            ${earnings.overtimeAmount > 0 ? `
            <tr>
              <td>Overtime (${att.overtimeHours} hrs @ ₹${earnings.overtimeRate}/hr)</td>
              <td class="amount-col">${formatINR(earnings.overtimeAmount)}</td>
            </tr>` : ''}
            ${earnings.bonus > 0 ? `
            <tr>
              <td>Incentive / Bonus</td>
              <td class="amount-col">${formatINR(earnings.bonus)}</td>
            </tr>` : ''}
            ${earnings.otherEarnings > 0 ? `
            <tr>
              <td>Other Earnings</td>
              <td class="amount-col">${formatINR(earnings.otherEarnings)}</td>
            </tr>` : ''}
            <tr class="subtotal-row">
              <td>Total Gross Earnings</td>
              <td class="amount-col">${formatINR(earnings.grossSalary)}</td>
            </tr>
          </table>
        </div>

        <!-- Deductions -->
        <div class="salary-col">
          <div class="col-header">Deductions</div>
          <table>
            ${deductions.unpaidLeaveDeduction > 0 ? `
            <tr>
              <td>Unpaid Absence Deduction (${att.unpaidLeave} days)</td>
              <td class="amount-col" style="color:#EF4444;">${formatINR(deductions.unpaidLeaveDeduction)}</td>
            </tr>` : ''}
            ${deductions.halfDayDeduction > 0 ? `
            <tr>
              <td>Half-Day Deduction (${att.halfDays} half-days)</td>
              <td class="amount-col" style="color:#EF4444;">${formatINR(deductions.halfDayDeduction)}</td>
            </tr>` : ''}
            ${deductions.pf > 0 ? `
            <tr>
              <td>Provident Fund (PF)</td>
              <td class="amount-col">${formatINR(deductions.pf)}</td>
            </tr>` : ''}
            ${deductions.esi > 0 ? `
            <tr>
              <td>ESI Contribution</td>
              <td class="amount-col">${formatINR(deductions.esi)}</td>
            </tr>` : ''}
            ${deductions.profTax > 0 ? `
            <tr>
              <td>Professional Tax (PT)</td>
              <td class="amount-col">${formatINR(deductions.profTax)}</td>
            </tr>` : ''}
            ${deductions.tds > 0 ? `
            <tr>
              <td>Tax Deducted at Source (TDS)</td>
              <td class="amount-col">${formatINR(deductions.tds)}</td>
            </tr>` : ''}
            ${deductions.otherDeductions > 0 ? `
            <tr>
              <td>Other Deductions</td>
              <td class="amount-col">${formatINR(deductions.otherDeductions)}</td>
            </tr>` : ''}
            <tr class="subtotal-row">
              <td>Total Deductions</td>
              <td class="amount-col" style="color:#EF4444;">${formatINR(deductions.totalDeductions)}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="net-pay-banner">
        <div>
          <div class="net-pay-title">Net Take-Home Salary</div>
          <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
            ${payroll.proRata?.isProRata ? escapeHtml(payroll.proRata.notes) : 'Standard Full Month Cycle'}
          </div>
        </div>
        <div class="net-pay-val">${formatINR(payroll.netSalary)}</div>
      </div>

      <div class="payment-info">
        <div>
          <strong>Status:</strong>
          <span class="badge ${payroll.status === 'PAID' ? 'badge-paid' : 'badge-pending'}">
            ${escapeHtml(payroll.status)}
          </span>
        </div>
        <div>
          <strong>Payment Mode:</strong> ${escapeHtml(payment.paymentMethod || 'Direct Deposit')}
        </div>
        <div>
          <strong>Transaction Ref:</strong> ${escapeHtml(payment.transactionId || 'Pending Disbursal')}
        </div>
      </div>

      <div class="footer">
        <div>This is a system-generated payslip from Altera Interior. No signature required.</div>
        <div>CONFIDENTIAL • FOR EMPLOYEE USE ONLY</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate PDF file on device
 */
export async function generatePayslipPdf(
  payroll: PayrollRecord,
  employee: any
): Promise<{ uri: string; base64: string; filename: string }> {
  const html = buildPayslipHtml(payroll, employee);
  const cleanName = (employee?.name || payroll.employee?.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Payslip_${cleanName}_${payroll.month}.pdf`;

  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
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

  return { uri: destUri, base64: base64 ?? '', filename };
}

/**
 * Download / Share Payslip PDF
 */
export async function downloadPayslipPdf(
  payroll: PayrollRecord,
  employee: any
): Promise<void> {
  const { uri, filename } = await generatePayslipPdf(payroll, employee);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Download ${filename}`,
    });
  }
}
