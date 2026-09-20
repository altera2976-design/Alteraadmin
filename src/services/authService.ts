import api from './api';

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

