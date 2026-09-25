import api from './api';

export interface QuotationMeasurement {
  length: number;
  width: number;
  height: number;
  calculatedArea: number;
}

export interface QuotationSpecification {
  carcass?: string;
  shutter?: string;
  finish?: string;
  brand?: string;
  hardware?: string;
  thickness?: string;
}

export interface QuotationAccessory {
  _id?: string;
  name: string;
  qty: number;
  inclusionType: 'INCLUDED' | 'EXCLUDED' | 'LUMP_SUM' | 'ACTUAL_COST';
  cost: number;
}

export interface QuotationItemDoc {
  _id?: string;
  itemNumber: number;
  room: string;
  name: string;
  description?: string;
  unit: string;
  measurements?: QuotationMeasurement;
  quantity: number;
  rate: number;
  amount: number;
  specifications?: QuotationSpecification;
  accessories?: QuotationAccessory[];
  remarks?: string;
  scope?: 'COMPANY_SCOPE' | 'CLIENT_SCOPE';
  costVariationNote?: string;
}

export interface QuotationPricing {
  subtotal: number;
  handlingFeePercent: number;
  handlingFeeAmount: number;
  designFeePercent: number;
  designFeeAmount: number;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  gstType: 'CGST_SGST' | 'IGST' | 'AS_PER_ACTUAL';
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  amountInWords: string;
}

export interface QuotationMilestone {
  _id?: string;
  milestoneName: string;
  percentage: number;
  amount: number;
  stage?: string;
}

export interface QuotationClient {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

export interface QuotationBankDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId?: string;
}

export interface QuotationCompanyDetails {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  logoUrl?: string;
}

export interface QuotationDoc {
  _id: string;
  quotationNumber: string;
  revision: number;
  isLatest: boolean;
  parentQuotationId?: string;
  clientId?: string;
  client: QuotationClient;
  projectTitle: string;
  projectType: string;
  siteLocation: string;
  assignedDesigner?: any;
  assignedDesignerName?: string;
  status:
    | 'Draft'
    | 'Sent'
    | 'Viewed'
    | 'Under Discussion'
    | 'Approved'
    | 'Rejected'
    | 'Expired'
    | 'Revised'
    | 'Converted to Project'
    | 'Cancelled';
  quotationDate: string;
  validUntil: string;
  items: QuotationItemDoc[];
  pricing: QuotationPricing;
  paymentMilestones: QuotationMilestone[];
  termsAndConditions: string[];
  bankDetails: QuotationBankDetails;
  companyDetails: QuotationCompanyDetails;
  publicToken?: string;
  clientApproval?: {
    approved: boolean;
    approvedAt?: string;
    clientComments?: string;
    rejectionReason?: string;
  };
  convertedProject?: {
    projectId?: any;
    convertedAt?: string;
    convertedBy?: any;
  };
  notes?: string;
  paymentSummary?: QuotationPaymentSummary;
  transactions?: any[];
  auditLog?: Array<{
    action: string;
    performedBy?: string;
    performedByName?: string;
    timestamp: string;
    details?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationPaymentSummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
}

export interface QuotationSummaryKpis {
  totalQuotations: number;
  draftCount: number;
  sentCount: number;
  approvedCount: number;
  rejectedCount: number;
  expiredCount: number;
  convertedCount: number;
  totalPipelineValue: number;
  approvedValue: number;
}

export interface QuotationConfig {
  companyDetails: QuotationCompanyDetails;
  bankDetails: QuotationBankDetails;
  termsAndConditions: string[];
  defaultMilestones: QuotationMilestone[];
  roomCategories: string[];
  defaultGstPercent: number;
  defaultHandlingFeePercent: number;
  defaultDesignFeePercent: number;
}

export const quotationApi = {
  /**
   * Get quotations list with query parameters
   */
  getQuotations: async (params?: any): Promise<{
    success: boolean;
    quotations: QuotationDoc[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> => {
    const res = await api.get('/quotations', { params });
    return res.data;
  },

  /**
   * Get dashboard summary KPIs
   */
  getSummary: async (): Promise<{
    success: boolean;
    summary: QuotationSummaryKpis;
    recentQuotations: QuotationDoc[];
  }> => {
    const res = await api.get('/quotations/summary');
    return res.data;
  },

  /**
   * Get single quotation by ID
   */
  getQuotationById: async (
    id: string
  ): Promise<{ success: boolean; quotation: QuotationDoc; revisions: QuotationDoc[] }> => {
    const res = await api.get(`/quotations/${id}`);
    return res.data;
  },

  /**
   * Create new quotation
   */
  createQuotation: async (
    payload: any
  ): Promise<{ success: boolean; message: string; quotation: QuotationDoc }> => {
    const res = await api.post('/quotations', payload);
    return res.data;
  },

  /**
   * Update quotation or fork into revision
   */
  updateQuotation: async (
    id: string,
    payload: any
  ): Promise<{ success: boolean; message: string; quotation: QuotationDoc }> => {
    const res = await api.put(`/quotations/${id}`, payload);
    return res.data;
  },

  /**
   * Send quotation via email with PDF base64
   */
  sendQuotation: async (
    id: string,
    payload: {
      recipientEmail?: string;
      cc?: string;
      subject?: string;
      message?: string;
      pdfBase64: string;
    }
  ): Promise<{ success: boolean; message: string; previewUrl?: string; quotation: QuotationDoc }> => {
    const res = await api.post(`/quotations/${id}/send`, payload);
    return res.data;
  },

  /**
   * Convert approved quotation to an active Project
   */
  convertToProject: async (
    id: string
  ): Promise<{ success: boolean; message: string; project: any; client: any; quotation: QuotationDoc }> => {
    const res = await api.post(`/quotations/${id}/convert-to-project`);
    return res.data;
  },

  /**
   * Delete quotation
   */
  deleteQuotation: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/quotations/${id}`);
    return res.data;
  },

  /**
   * Get quotation configuration & templates
   */
  getConfig: async (): Promise<{ success: boolean; data: QuotationConfig }> => {
    const res = await api.get('/quotations/config');
    return res.data;
  },

  /**
   * Update quotation configuration & templates
   */
  updateConfig: async (
    config: Partial<QuotationConfig>
  ): Promise<{ success: boolean; message: string; data: QuotationConfig }> => {
    const res = await api.put('/quotations/config', config);
    return res.data;
  },

  /**
   * Client approval via public token
   */
  clientApprove: async (
    token: string,
    payload: { comments?: string; clientName?: string }
  ): Promise<{ success: boolean; message: string; quotation: QuotationDoc }> => {
    const res = await api.post(`/quotations/public/${token}/approve`, payload);
    return res.data;
  },

  /**
   * Client rejection via public token
   */
  clientReject: async (
    token: string,
    payload: { reason?: string; clientName?: string }
  ): Promise<{ success: boolean; message: string; quotation: QuotationDoc }> => {
    const res = await api.post(`/quotations/public/${token}/reject`, payload);
    return res.data;
  },

  /**
   * Fetch transactions & calculated payment summary for a quotation
   */
  getQuotationTransactions: async (
    id: string
  ): Promise<{
    success: boolean;
    quotationNumber: string;
    paymentSummary: QuotationPaymentSummary;
    transactions: any[];
  }> => {
    const res = await api.get(`/quotations/${id}/transactions`);
    return res.data;
  },

  /**
   * Add payment / transaction against a quotation
   */
  addQuotationTransaction: async (
    id: string,
    payload: {
      amount: number;
      paymentMethod?: string;
      referenceId?: string;
      description?: string;
      notes?: string;
      status?: string;
      transactionDate?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
    paymentSummary: QuotationPaymentSummary;
    transactions: any[];
  }> => {
    const res = await api.post(`/quotations/${id}/transactions`, payload);
    return res.data;
  },
};
