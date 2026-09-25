import api from './api';

export interface TransactionTimeline {
  status: string;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface TransactionDoc {
  _id: string;
  transactionId: string;
  referenceId: string;
  userId?: string;
  employeeId?: string;
  employeeName?: string;
  adminId?: string;
  adminName?: string;
  customerId?: string;
  customerName?: string;
  quotationId?: string;
  invoiceId?: string;
  payrollId?: string;
  amount: number;
  paymentMethod: 'CASH' | 'ONLINE' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'OTHER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  type:
    | 'PAYMENT_RECEIVED'
    | 'Payment Received'
    | 'Quotation Payment'
    | 'REFUND'
    | 'Refund'
    | 'PAYROLL_DISBURSEMENT'
    | 'Payroll Disbursement'
    | 'EXPENSE'
    | 'Expense'
    | 'OTHER';
  note?: string;
  timeline?: TransactionTimeline[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionSummary {
  completedTotalAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  todayTotal: number;
  monthlyTotal: number;
  totalCompletedCount: number;
  totalPendingCount: number;
  totalRefundedCount: number;
}

export const getTransactions = async (params?: Record<string, any>) => {
  const response = await api.get<{
    success: boolean;
    data: TransactionDoc[];
    summary: TransactionSummary;
    total: number;
    page: number;
    totalPages: number;
  }>('/transactions', { params });
  return response.data;
};

export const getTransactionSummary = async () => {
  const response = await api.get<{
    success: boolean;
    data: TransactionSummary;
  }>('/transactions/summary');
  return response.data;
};

export const getTransactionById = async (id: string) => {
  const response = await api.get<{
    success: boolean;
    data: TransactionDoc;
  }>(`/transactions/${id}`);
  return response.data;
};

export const createTransaction = async (data: Partial<TransactionDoc>) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: TransactionDoc;
  }>('/transactions', data);
  return response.data;
};

export const refundTransaction = async (id: string, reason?: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: TransactionDoc;
  }>(`/transactions/${id}/refund`, { reason });
  return response.data;
};

