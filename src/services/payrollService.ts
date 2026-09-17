import api from './api';

export interface AttendanceSummary {
  totalCalendarDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeave: number;
  unpaidLeave: number;
  holidays: number;
  weekOffs: number;
  lateDays: number;
  regularWorkingHours: number;
  actualWorkingHours: number;
  overtimeHours: number;
}

export interface PayrollEarnings {
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  overtimeRate: number;
  overtimeAmount: number;
  otherEarnings: number;
  grossSalary: number;
}

export interface PayrollDeductions {
  unpaidLeaveDeduction: number;
  halfDayDeduction: number;
  pf: number;
  esi: number;
  profTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
}

export interface PayrollRecord {
  _id: string;
  userId: any;
  month: string;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'CANCELLED';
  salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY';
  perDaySalary: number;
  attendanceSummary: AttendanceSummary;
  earnings: PayrollEarnings;
  deductions: PayrollDeductions;
  netSalary: number;
  proRata?: {
    isProRata: boolean;
    joiningDate?: string;
    eligibleDays?: number;
    notes?: string;
  };
  payment?: {
    paidAmount: number;
    paymentDate?: string;
    paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'UPI' | 'CHEQUE' | 'PENDING';
    transactionId?: string;
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  };
  attendanceSnapshotHash?: string;
  attendanceChangedAfterApproval?: boolean;
  employee?: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
    designation?: string;
    salary?: number;
  };
  auditLog?: Array<{
    action: string;
    performedBy?: string;
    performedByName?: string;
    timestamp: string;
    details?: string;
    previousValue?: any;
    newValue?: any;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  statusCounts: {
    draft: number;
    calculated: number;
    approved: number;
    paid: number;
  };
}

export interface PayrollCalculateResponse {
  success: boolean;
  month: string;
  summary: PayrollSummary;
  payroll: PayrollRecord[];
  message?: string;
}

export interface PayrollConfig {
  standardWorkingHours: number;
  workingDaysPerWeek: number;
  weekOffDays: number[];
  holidays: Array<{ date: string; name: string }>;
  calculationMethod: 'CALENDAR_DAYS' | 'WORKING_DAYS';
  defaultOvertimeRatePerHour: number;
  halfDaySalaryRatio: number;
  deductionRules: {
    pfPercentage: number;
    esiPercentage: number;
    profTaxFixed: number;
    tdsDefaultPercentage: number;
  };
}

export const payrollService = {
  /**
   * Calculate or retrieve monthly payroll
   */
  calculate: async (month: string, recalculate?: boolean): Promise<PayrollCalculateResponse> => {
    const res = await api.get('/payroll/calculate', {
      params: {
        month,
        ...(recalculate ? { recalculate: 'true' } : {}),
      },
    });
    return res.data;
  },

  /**
   * Get detailed salary breakdown for an employee
   */
  getEmployeeDetail: async (id: string, month?: string): Promise<{ success: boolean; month: string; employee: any; payroll: PayrollRecord }> => {
    const res = await api.get(`/payroll/employee/${id}`, {
      params: { month },
    });
    return res.data;
  },

  /**
   * Approve monthly payroll
   */
  approve: async (month: string, employeeIds?: string[]): Promise<{ success: boolean; message: string; count: number }> => {
    const res = await api.post('/payroll/approve', { month, employeeIds });
    return res.data;
  },

  /**
   * Mark payroll as paid
   */
  pay: async (payload: {
    payrollId: string;
    paymentMethod?: string;
    transactionId?: string;
    paidAmount?: number;
    paymentDate?: string;
  }): Promise<{ success: boolean; message: string; payroll: PayrollRecord }> => {
    const res = await api.post('/payroll/pay', payload);
    return res.data;
  },

  /**
   * Send payslip PDF to employee email
   */
  sendPayslip: async (payload: {
    payrollId: string;
    recipientEmail?: string;
    subject?: string;
    message?: string;
    pdfBase64: string;
  }): Promise<{ success: boolean; message: string; previewUrl?: string }> => {
    const res = await api.post('/payroll/send-payslip', payload);
    return res.data;
  },

  /**
   * Get payroll rules & holidays configuration
   */
  getConfig: async (): Promise<{ success: boolean; data: PayrollConfig }> => {
    const res = await api.get('/payroll/config');
    return res.data;
  },

  /**
   * Update payroll rules & holidays configuration
   */
  updateConfig: async (config: Partial<PayrollConfig>): Promise<{ success: boolean; message: string; data: PayrollConfig }> => {
    const res = await api.put('/payroll/config', config);
    return res.data;
  },

  /**
   * Update employee salary structure
   */
  updateEmployeeSalary: async (
    id: string,
    payload: { salary?: number; salaryType?: string; salaryStructure?: any }
  ): Promise<{ success: boolean; message: string; employee: any }> => {
    const res = await api.put(`/payroll/employee-salary/${id}`, payload);
    return res.data;
  },
};
