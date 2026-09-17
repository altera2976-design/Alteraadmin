import api from './api';

export interface ReportPeriod {
  label: string;
  start: string;
  end: string;
}

export interface ReportSummaryData {
  totalRevenue: number;
  previousRevenue: number;
  revenueChangePercent: number;
  revenueChangeText: string;
  trendBars: number[];
  projects: number;
  sales: number;
  employees: number;
  attendance: number;
  payments: number;
  totalBikeExpense: number;
  netIncome: number;
}

export interface ReportSummaryResponse {
  success: boolean;
  period: ReportPeriod;
  data: ReportSummaryData;
}

export interface DetailedReportResponse {
  success: boolean;
  type: string;
  period: string;
  count: number;
  summary: Record<string, any>;
  data: any[];
}

export interface SendEmailPayload {
  recipients: string;
  subject: string;
  message?: string;
  reportType: string;
  period: string;
  filename: string;
  attachmentBase64: string;
  mimeType: string;
}

export const reportService = {
  getSummary: async (params?: { month?: number; year?: number; startDate?: string; endDate?: string }): Promise<ReportSummaryResponse> => {
    const res = await api.get<ReportSummaryResponse>('/reports', { params });
    return res.data;
  },

  getDetails: async (params: {
    type: 'project' | 'sales' | 'employee' | 'attendance' | 'payment';
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }): Promise<DetailedReportResponse> => {
    const res = await api.get<DetailedReportResponse>('/reports/details', { params });
    return res.data;
  },

  sendEmail: async (payload: SendEmailPayload): Promise<{ success: boolean; message: string; previewUrl?: string }> => {
    const res = await api.post<{ success: boolean; message: string; previewUrl?: string }>('/reports/send-email', payload);
    return res.data;
  },
};
