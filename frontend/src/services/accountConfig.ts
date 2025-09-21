import api from './api';

export interface AccountConfig {
  account_id: string;
  account_name?: string;
  initial_capital: number;
  currency: string;
  broker?: string;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at?: string;
  created_by?: number;
}

export interface AccountConfigCreate {
  account_id: string;
  account_name?: string;
  initial_capital: number;
  currency?: string;
  broker?: string;
  description?: string;
  tags?: string[];
  config?: Record<string, any>;
}

export interface AccountConfigUpdate {
  account_name?: string;
  initial_capital?: number;
  currency?: string;
  broker?: string;
  description?: string;
  tags?: string[];
  config?: Record<string, any>;
}

export interface AccountPermission {
  id: number;
  user_id: number;
  account_id: string;
  permission_type: string;
  created_at: string;
  created_by?: number;
}

export interface AccountPermissionUpdate {
  user_id: number;
  account_id: string;
  permission_type: string;
}

export const accountConfigApi = {
  // 获取所有交易账户（管理员）
  getAllAccounts: () =>
    api.get<AccountConfig[]>('/account-config/accounts'),

  // 创建交易账户（管理员）
  createAccount: (data: AccountConfigCreate) =>
    api.post<AccountConfig>('/account-config/accounts', data),

  // 更新交易账户（管理员）
  updateAccount: (accountId: string, data: AccountConfigUpdate) =>
    api.put<AccountConfig>(`/account-config/accounts/${accountId}`, data),

  // 删除交易账户（管理员）
  deleteAccount: (accountId: string) =>
    api.delete(`/account-config/accounts/${accountId}`),

  // 获取权限矩阵（管理员）
  getPermissions: () =>
    api.get<AccountPermission[]>('/account-config/permissions'),

  // 更新权限分配（管理员）
  updatePermissions: (permissions: AccountPermissionUpdate[]) =>
    api.put('/account-config/permissions', permissions),

  // 获取我的交易账户（所有用户）
  getMyAccounts: () =>
    api.get<AccountConfig[]>('/account-config/my-accounts'),

  // 获取特定用户的权限
  getUserPermissions: (userId: number) =>
    api.get<string[]>(`/account-config/permissions/user/${userId}`),

  // 设置用户权限
  setUserPermissions: (userId: number, accountIds: string[]) =>
    api.post(`/account-config/permissions/user/${userId}`, accountIds),
};