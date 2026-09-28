import api from './api';

export interface EmployeeAppPermissions {
  dashboard: boolean;
  tasks: boolean;
  attendance: boolean;
  salary: boolean;
  crm: boolean;
  projects: boolean;
  quotation: boolean;
  reports: boolean;
  bikeTracking: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'EMPLOYEE';
  employeeId: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: number;
  workingHours: number;
  status: 'ACTIVE' | 'INACTIVE';
  accessStatus?: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  salaryStatus?: 'NOT_SET' | 'ACTIVE' | 'UPDATED' | 'INACTIVE';
  employeeAppPermissions?: EmployeeAppPermissions;
  salaryStructure?: {
    basic?: number;
    hra?: number;
    allowances?: number;
    bonus?: number;
    effectiveDate?: string;
  };
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    return res.data;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/register', {
      fullName: data.name,
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone || '',
    });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<{ success: boolean; user: User }>('/auth/me');
    return res.data.user;
  },

  getMyAppPermissions: async (): Promise<{
    success: boolean;
    permissions: EmployeeAppPermissions;
    accessStatus?: string;
    status?: string;
  }> => {
    const res = await api.get('/employee/permissions');
    return res.data;
  },

  updateProfile: async (data: {
    name?: string;
    phone?: string;
    email?: string;
    department?: string;
    designation?: string;
  }): Promise<User> => {
    const res = await api.put<{ success: boolean; user: User; message: string }>('/auth/profile', data);
    return res.data.user;
  },

  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/google', { idToken });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword });
    return res.data;
  },
};


