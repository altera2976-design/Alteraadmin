import api from './api';

export const getTransactions = async (params = {}) => {
  const response = await api.get('/transactions', { params });
  return response.data;
};

export const getTransactionSummary = async (params = {}) => {
  const response = await api.get('/transactions/summary', { params });
  return response.data;
};

export const getTransactionById = async (id) => {
  const response = await api.get(`/transactions/${id}`);
  return response.data;
};

export const getTransactionTimeline = async (id) => {
  const response = await api.get(`/transactions/${id}/timeline`);
  return response.data;
};

export const createTransaction = async (data) => {
  const response = await api.post('/transactions', data);
  return response.data;
};

export const updateTransaction = async (id, data) => {
  const response = await api.patch(`/transactions/${id}`, data);
  return response.data;
};

export const refundTransaction = async (id, reason = '') => {
  const response = await api.post(`/transactions/${id}/refund`, { reason });
  return response.data;
};

export const exportTransactions = async (params = {}) => {
  const response = await api.get('/transactions/export', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  });
  return response.data;
};

export const deleteTransaction = async (id) => {
  const response = await api.delete(`/transactions/${id}`);
  return response.data;
};
