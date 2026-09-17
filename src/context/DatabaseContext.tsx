import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Quotation Types
// ─────────────────────────────────────────────────────────────────────────────
export interface QuotationItem {
  id: string;
  description: string;
  unit: string;
  qty: string;      // kept as string so TextInput stays controlled
  rate: string;     // kept as string so TextInput stays controlled
  remarks: string;
  // amount = parseFloat(qty) * parseFloat(rate)  — computed on the fly
}

export interface QuotationSection {
  id: string;
  name: string;
  items: QuotationItem[];
}

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  validUntil: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  // Customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  // Project
  projectTitle: string;
  projectSite: string;
  gstPercent: string;
  // Sections
  sections: QuotationSection[];
  // Additional Details (optional — used in PDF)
  architect?: string;
  salesperson?: string;
  transportation?: string;   // numeric string, e.g. '5000'
  designCharges?: string;    // numeric string
  handlingCharges?: string;  // numeric string
  specifications?: string;   // free text
  paymentTerms?: string;     // free text
  notes?: string;            // free text
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const initialProjects = [
  { id: 'PR-001', client: 'Rahul Sharma', type: 'Modular Kitchen', value: 245000, status: 'In Progress', startDate: '10 May 2024', endDate: '15 Jun 2024', employee: 'Ravi Kumar', image: 'https://images.unsplash.com/photo-1556910103-1c02745a872f?w=400&q=80' },
  { id: 'PR-002', client: 'Priya Mehta', type: 'Living Room Interior', value: 450000, status: 'Planning', startDate: '01 Jun 2024', endDate: '30 Jul 2024', employee: 'Anita Patel', image: 'https://images.unsplash.com/photo-1583847268964-b28ce8f3e098?w=400&q=80' },
];

const initialClients = [
  { id: 'CL-001', name: 'Rahul Sharma', company: 'Sharma Residence', phone: '+91 9876543210', email: 'rahul@example.com', status: 'Active', dateAdded: '21 May 2024', type: 'All Clients', image: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 'CL-002', name: 'Priya Mehta', company: 'Mehta Villas', phone: '+91 9876543211', email: 'priya@example.com', status: 'Active', dateAdded: '20 May 2024', type: 'Projects', image: 'https://randomuser.me/api/portraits/women/2.jpg' },
];

const initialQuotations: Quotation[] = [];

const initialAttendance = [
  { id: 'AT-001', date: '2026-09-02', name: 'Arjun Singh', role: 'Site Supervisor', status: 'Present', checkIn: '08:45 AM', checkOut: '06:15 PM' },
  { id: 'AT-002', date: '2026-09-02', name: 'Ravi Kumar', role: 'Carpenter', status: 'Present', checkIn: '09:00 AM', checkOut: '06:00 PM' },
  { id: 'AT-003', date: '2026-09-02', name: 'Suresh Patel', role: 'Electrician', status: 'Late', checkIn: '10:30 AM', checkOut: '--:--' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Context Definition
// ─────────────────────────────────────────────────────────────────────────────
interface DatabaseContextType {
  projects: any[];
  clients: any[];
  quotations: Quotation[];
  attendance: any[];
  addProject: (project: any) => void;
  updateProject: (id: string, updates: any) => void;
  updateProjectStatus: (id: string, status: string) => void;
  addClient: (client: any) => void;
  addQuotation: (quotation: Quotation) => void;
  updateQuotation: (quotation: Quotation) => void;
  deleteQuotation: (id: string) => void;
  updateAttendance: (id: string, status: string) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState(initialProjects);
  const [clients, setClients] = useState(initialClients);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [attendance, setAttendance] = useState(initialAttendance);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      if (res.data && res.data.data) {
        // Map backend schema (_id, name, deadline, assignedTeam) to frontend expectations if necessary
        // Or keep them as is. The frontend expects: id, client, type, value, status, startDate, endDate, employee, image
        const formatted = res.data.data.map((p: any) => ({
          ...p,
          id: p._id,
          type: p.name,
          endDate: p.deadline,
          employee: p.assignedTeam,
          notes: p.description
        }));
        setProjects(formatted);
      }
    } catch (err) {
      console.log('Failed to fetch projects', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      if (res.data && res.data.data) {
        const formatted = res.data.data.map((c: any) => ({
          ...c,
          id: c._id,
        }));
        setClients(formatted);
      }
    } catch (err) {
      console.log('Failed to fetch clients', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  // ... (keep addProject/updateProject) ...
  const addProject = async (project: any) => {
    try {
      const backendPayload = {
        name: project.type,
        client: project.client,
        value: project.value,
        status: project.status,
        startDate: project.startDate,
        deadline: project.endDate,
        assignedTeam: project.employee,
        description: project.notes,
        image: project.image
      };
      await api.post('/projects', backendPayload);
      fetchProjects();
    } catch (err) {
      console.log('Failed to create project', err);
    }
  };

  const updateProject = async (id: string, updates: any) => {
    try {
      // mapping frontend keys to backend keys
      const backendPayload: any = {};
      if (updates.type) backendPayload.name = updates.type;
      if (updates.client) backendPayload.client = updates.client;
      if (updates.value !== undefined) backendPayload.value = updates.value;
      if (updates.status) backendPayload.status = updates.status;
      if (updates.progress !== undefined) backendPayload.progress = updates.progress;
      if (updates.tasks !== undefined) backendPayload.tasks = updates.tasks;
      if (updates.employee) backendPayload.assignedTeam = updates.employee;
      if (updates.startDate) backendPayload.startDate = updates.startDate;
      if (updates.endDate) backendPayload.deadline = updates.endDate;
      if (updates.notes) backendPayload.description = updates.notes;
      if (updates.image) backendPayload.image = updates.image;

      await api.put(`/projects/${id}`, backendPayload);
      fetchProjects();
    } catch (err) {
      console.log('Failed to update project', err);
    }
  };

  const updateProjectStatus = async (id: string, status: string) => {
    await updateProject(id, { status });
  };

  const addClient = async (client: any) => {
    try {
      await api.post('/clients', client);
      fetchClients();
    } catch (err) {
      console.log('Failed to create client', err);
    }
  };

  const addQuotation = (quotation: Quotation) => {
    setQuotations(prev => [quotation, ...prev]);
  };

  const updateQuotation = (quotation: Quotation) => {
    setQuotations(prev => prev.map(q => q.id === quotation.id ? quotation : q));
  };

  const deleteQuotation = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
  };

  const updateAttendance = (id: string, status: string) => {
    setAttendance(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <DatabaseContext.Provider value={{
      projects, clients, quotations, attendance,
      addProject, updateProject, updateProjectStatus, addClient,
      addQuotation, updateQuotation, deleteQuotation,
      updateAttendance,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
