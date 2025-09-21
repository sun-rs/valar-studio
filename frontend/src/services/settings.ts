import api from './api';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  note1?: string;
  note2?: string;
  created_at: string;
  last_login?: string;
}

export interface UserCreate {
  username: string;
  password: string;
  role: 'admin' | 'user';
  note1?: string;
  note2?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  username?: string;
  password?: string;
  role?: 'admin' | 'user';
  note1?: string;
  note2?: string;
  is_active?: boolean;
}

export const settingsService = {
  // User Management (Admin only)
  getUsers: async (): Promise<User[]> => {
    return await api.get('/settings/users');
  },

  createUser: async (data: UserCreate): Promise<User> => {
    return await api.post('/settings/users', data);
  },

  updateUser: async (userId: number, data: UserUpdate): Promise<User> => {
    return await api.put(`/settings/users/${userId}`, data);
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/settings/users/${userId}`);
  },

  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    await api.post(`/settings/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  },

  // User Profile
  updateProfile: async (data: { note1?: string; note2?: string }): Promise<void> => {
    await api.put('/settings/profile', data);
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/settings/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};