import api from './api';

export interface Lead {
  _id: string;
  leadNumber?: string;
  name: string;
  phone: string;
  email?: string;
  propertyType?: string;
  requirement?: string;
  budget?: number;
  location?: string;
  leadSource?: string;
  status: 'New Lead' | 'Contacted' | 'Qualified' | 'Consultation' | 'Site Visit' | 'Design' | 'Quotation' | 'Negotiation' | 'Approved' | 'Converted' | 'Lost' | 'Project' | string;
  notes?: string;
  createdAt?: string;
  nextFollowUpDate?: string;
}

export interface Client {
  _id: string;
  clientId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  projectCount?: number;
  totalSpent?: number;
  createdAt?: string;
}

export interface FollowUp {
  _id: string;
  targetId?: string;
  targetType: 'Lead' | 'Client';
  targetName: string;
  targetPhone?: string;
  followUpDate: string;
  followUpTime?: string;
  type?: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface SalesPipelineStage {
  stage: string;
  count: number;
  value: number;
  conversionRate: number;
  stepRate: number;
}

export interface SalesPipelineResponse {
  success: boolean;
  totalLeads: number;
  overallConversionRate: number;
  pipeline: SalesPipelineStage[];
}

export const crmApi = {
  // Get all leads with optional filters
  getLeads: async (params?: { status?: string; source?: string; search?: string }): Promise<Lead[]> => {
    let url = '/crm/leads';
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.source && params.source !== 'All') query.append('source', params.source);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;

    const res = await api.get(url);
    return res.data.data || [];
  },

  // Create new lead
  createLead: async (data: Partial<Lead>): Promise<Lead> => {
    const res = await api.post('/crm/leads', data);
    return res.data.data;
  },

  // Update lead
  updateLead: async (id: string, data: Partial<Lead>): Promise<Lead> => {
    const res = await api.put(`/crm/leads/${id}`, data);
    return res.data.data;
  },

  // Get clients
  getClients: async (): Promise<Client[]> => {
    const res = await api.get('/clients');
    return res.data.data || res.data.clients || [];
  },

  // Get follow-ups
  getFollowUps: async (params?: { status?: string }): Promise<FollowUp[]> => {
    let url = '/crm/follow-ups';
    if (params?.status && params.status !== 'All') url += `?status=${params.status}`;
    const res = await api.get(url);
    return res.data.data || [];
  },

  // Create follow-up
  createFollowUp: async (data: Partial<FollowUp>): Promise<FollowUp> => {
    const res = await api.post('/crm/follow-ups', data);
    return res.data.data;
  },

  // Update follow-up status
  updateFollowUpStatus: async (id: string, status: string, notes?: string): Promise<FollowUp> => {
    const res = await api.patch(`/crm/follow-ups/${id}/status`, { status, completedNotes: notes });
    return res.data.data;
  },

  // Get Sales Pipeline stats
  getSalesPipeline: async (): Promise<SalesPipelineResponse> => {
    const res = await api.get('/crm/sales-pipeline');
    return res.data;
  },
};
