import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Select,
  Space,
  Table,
  Modal,
  message,
  Row,
  Col,
  Switch,
  Popconfirm,
  Tag,
  DatePicker,
  Statistic,
  Radio
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  KeyOutlined,
  TeamOutlined,
  LogoutOutlined,
  SecurityScanOutlined,
  ClearOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { settingsService } from '../../services/settings';
import { securityService, LoginAttempt, AccessLog, SecurityStats } from '../../services/security';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { formatBackendDate, formatDateWithFallback } from '../../utils/dateFormat';

import './index.css';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  note1?: string;
  note2?: string;
  created_at: string;
  last_login?: string;
}

const Settings: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 安全日志相关状态
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs().endOf('day') // 设置为今天的结束时间，避免明天的记录
  ]);
  const [logType, setLogType] = useState<'login_attempts' | 'unauthorized_access' | 'authorized_access'>('unauthorized_access');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);

  const isAdmin = user?.role === 'admin';

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await settingsService.getUsers();
      setUsers(data);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 安全日志相关函数
  const fetchSecurityStats = async () => {
    if (!isAdmin) return;
    try {
      const stats = await securityService.getSecurityStats(
        dateRange[0].toISOString(),
        dateRange[1].toISOString()
      );
      setSecurityStats(stats);
    } catch (error) {
      message.error('获取安全统计失败');
    }
  };

  const fetchSecurityLogs = async (page = 1) => {
    if (!isAdmin) return;
    setSecurityLoading(true);
    try {
      const query = {
        start_date: dateRange[0].startOf('day').toISOString(),
        end_date: dateRange[1].endOf('day').toISOString(),
        page,
        size: pagination.pageSize
      };

      if (logType === 'login_attempts') {
        const response = await securityService.getLoginAttempts(query);
        setLoginAttempts(response.records);
        setPagination(prev => ({ ...prev, current: page, total: response.total }));
      } else if (logType === 'unauthorized_access') {
        const response = await securityService.getUnauthorizedAccessLogs(query);
        setAccessLogs(response.records);
        setPagination(prev => ({ ...prev, current: page, total: response.total }));
      } else if (logType === 'authorized_access') {
        const response = await securityService.getAuthorizedAccessLogs(query);
        setAccessLogs(response.records);
        setPagination(prev => ({ ...prev, current: page, total: response.total }));
      } else {
        // 兼容原来的access_logs类型
        const response = await securityService.getAccessLogs(query);
        setAccessLogs(response.records);
        setPagination(prev => ({ ...prev, current: page, total: response.total }));
      }
    } catch (error) {
      message.error('获取安全日志失败');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleCleanupLogs = async () => {
    if (!isAdmin) return;
    try {
      const result = await securityService.cleanupLogs(cleanupDays);
      message.success(`日志清理完成 - ${result.details.cleanup_type}`);
      setCleanupModalVisible(false);
      fetchSecurityLogs();
      fetchSecurityStats();
    } catch (error) {
      message.error('日志清理失败');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSecurityStats();
      fetchSecurityLogs();
    }
  }, [isAdmin, dateRange, logType]);

  const handleCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setShowUserModal(true);
  };

  const handleEditUser = (userData: User) => {
    setEditingUser(userData);
    userForm.setFieldsValue({
      username: userData.username,
      role: userData.role,
      note1: userData.note1,
      note2: userData.note2,
      is_active: userData.is_active,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await settingsService.deleteUser(userId);
      message.success('用户删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除用户失败');
    }
  };


  const handleSubmitUser = async (values: any) => {
    try {
      if (editingUser) {
        // 编辑模式：只传递有值的字段
        const updateData: any = {
          role: values.role,
          note1: values.note1,
          note2: values.note2,
          is_active: values.is_active,
        };

        // 如果用户名有变化，添加到更新数据中
        if (values.username && values.username !== editingUser.username) {
          updateData.username = values.username;
        }

        // 如果提供了新密码，添加到更新数据中
        if (values.password) {
          updateData.password = values.password;
        }

        await settingsService.updateUser(editingUser.id, updateData);
        message.success('用户更新成功');
      } else {
        // 创建模式：密码为必填
        if (!values.password) {
          message.error('请设置用户密码');
          return;
        }

        await settingsService.createUser(values);
        message.success(`用户创建成功，密码为：${values.password}`);
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleChangePassword = async (values: any) => {
    setLoading(true);
    try {
      await settingsService.changePassword(values.old_password, values.new_password);
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      await settingsService.updateProfile(values);
      message.success('个人信息更新成功');
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认登出',
      content: '确定要退出登录吗？',
      onOk: () => {
        logout();
        message.success('已退出登录');
      }
    });
  };

  const userColumns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '备注1',
      dataIndex: 'note1',
      key: 'note1',
      ellipsis: true,
      width: 150,
    },
    {
      title: '备注2',
      dataIndex: 'note2',
      key: 'note2',
      ellipsis: true,
      width: 150,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatBackendDate(date),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 180,
      render: (date: string) => formatDateWithFallback(date, '未登录'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          {record.id !== user?.id && (
            <Popconfirm
              title="确定删除这个用户吗？"
              onConfirm={() => handleDeleteUser(record.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 登录尝试表格列定义
  const loginAttemptColumns: ColumnsType<LoginAttempt> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
    },
    {
      title: '结果',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'green' : 'red'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'failure_reason',
      key: 'failure_reason',
      width: 150,
      ellipsis: true,
    },
    {
      title: '用户代理',
      dataIndex: 'user_agent',
      key: 'user_agent',
      width: 300,
      ellipsis: true,
      render: (userAgent: string) => {
        if (!userAgent || userAgent === 'unknown') {
          return <span style={{ color: '#999' }}>未知</span>;
        }
        return userAgent;
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatBackendDate(date),
    },
  ];

  // 访问日志表格列定义
  const accessLogColumns: ColumnsType<AccessLog> = [
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username: string) => {
        if (!username) {
          return <Tag color="red">未登录</Tag>;
        }
        return <Tag color="green">{username}</Tag>;
      },
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : 'orange'}>
          {method}
        </Tag>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 200,
      ellipsis: true,
      render: (path: string) => {
        // 突出显示安全敏感路径
        const isSecurityPath = path === '/' ||
          path.includes('/login') ||
          path.includes('/auth') ||
          path.includes('/api/v1/auth');

        if (isSecurityPath) {
          return <span style={{ color: '#ff7a00', fontWeight: 'bold' }}>{path}</span>;
        }
        return path;
      },
    },
    {
      title: '状态码',
      dataIndex: 'response_status',
      key: 'response_status',
      width: 80,
      render: (status: number) => (
        <Tag color={status < 300 ? 'green' : status < 400 ? 'blue' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '用户代理',
      dataIndex: 'user_agent',
      key: 'user_agent',
      width: 300,
      ellipsis: true,
      render: (userAgent: string) => {
        // 显示所有用户的真实用户代理信息（包括授权用户）
        if (!userAgent || userAgent === 'unknown') {
          return <span style={{ color: '#999' }}>未知</span>;
        }

        return userAgent;
      },
    },
    {
      title: '响应时间(ms)',
      dataIndex: 'response_time_ms',
      key: 'response_time_ms',
      width: 100,
      render: (time: number) => time ? `${time}ms` : '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatBackendDate(date),
    },
  ];

  return (
    <div className="settings">
      <Card className="settings-content">
        <Tabs defaultActiveKey="profile">
          {/* 个人设置 */}
          <TabPane tab="个人设置" key="profile" icon={<UserOutlined />}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{
                    username: user?.username,
                    role: user?.role,
                    note1: user?.note1,
                    note2: user?.note2,
                  }}
                  onFinish={handleUpdateProfile}
                >
                  <Form.Item label="用户名" name="username">
                    <Input disabled />
                  </Form.Item>
                  <Form.Item label="角色" name="role">
                    <Input disabled value={user?.role === 'admin' ? '管理员' : '用户'} />
                  </Form.Item>
                  <Form.Item label="备注1" name="note1">
                    <Input placeholder="请输入备注1" />
                  </Form.Item>
                  <Form.Item label="备注2" name="note2">
                    <TextArea placeholder="请输入备注2" rows={3} />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        保存修改
                      </Button>
                      <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                        退出登录
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </TabPane>

          {/* 修改密码 */}
          <TabPane tab="修改密码" key="password" icon={<KeyOutlined />}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handleChangePassword}
                >
                  <Form.Item
                    label="原密码"
                    name="old_password"
                    rules={[{ required: true, message: '请输入原密码' }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    label="新密码"
                    name="new_password"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码至少6个字符' }
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    label="确认新密码"
                    name="confirm_password"
                    dependencies={['new_password']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('new_password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </TabPane>

          {/* 用户管理（仅管理员） */}
          {isAdmin && (
            <>
              <TabPane tab="用户管理" key="users" icon={<TeamOutlined />}>
              <div style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateUser}
                >
                  创建用户
                </Button>
              </div>

              <Table
                columns={userColumns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1200 }}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab="安全日志" key="security" icon={<SecurityScanOutlined />}>
              {/* 统计信息 */}
              {securityStats && (
                <Row gutter={[16, 16]} className="settings-stats">
                  <Col xs={12} sm={12} md={6}>
                    <Card className="settings-stat-card">
                      <Statistic
                        title="总登录尝试"
                        value={securityStats.total_login_attempts}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={12} md={6}>
                    <Card className="settings-stat-card">
                      <Statistic
                        title="失败尝试"
                        value={securityStats.failed_login_attempts}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={12} md={6}>
                    <Card className="settings-stat-card">
                      <Statistic
                        title="唯一IP"
                        value={securityStats.unique_ips}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={12} md={6}>
                    <Card className="settings-stat-card">
                      <Statistic
                        title="被封IP"
                        value={securityStats.blocked_ips}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {/* 控制面板 */}
              <Card className="security-filter-card" style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle" className="security-toolbar">
                  <Col span={8}>
                    <Space>
                      <span>日期范围:</span>
                      <DatePicker.RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setDateRange([dates[0], dates[1]]);
                            // 日期变更时重置分页并立即刷新
                            setPagination(prev => ({ ...prev, current: 1 }));
                            setTimeout(() => fetchSecurityLogs(1), 100); // 延迟一点确保state更新
                          }
                        }}
                        format="YYYY-MM-DD"
                        style={{ width: 240 }}
                        allowClear={false}
                      />
                    </Space>
                  </Col>
                  <Col span={6}>
                    <Space>
                      <span>日志类型:</span>
                      <Select
                        value={logType}
                        onChange={setLogType}
                        style={{ width: 160 }}
                      >
                        <Select.Option value="unauthorized_access">🔴 未授权访问日志</Select.Option>
                        <Select.Option value="authorized_access">🟢 授权用户访问日志</Select.Option>
                        <Select.Option value="login_attempts">🔵 登录记录</Select.Option>
                      </Select>
                    </Space>
                  </Col>
                  <Col span={10}>
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          // 刷新时更新日期范围结束时间到现在，保持开始时间不变
                          const now = dayjs();
                          setDateRange([dateRange[0], now.endOf('day')]);
                          setPagination(prev => ({ ...prev, current: 1 }));
                          // 直接调用API，使用最新的时间范围
                          const query = {
                            start_date: dateRange[0].startOf('day').toISOString(),
                            end_date: now.endOf('day').toISOString(),
                            page: 1,
                            size: pagination.pageSize
                          };
                          setSecurityLoading(true);
                          if (logType === 'login_attempts') {
                            securityService.getLoginAttempts(query).then(response => {
                              setLoginAttempts(response.records);
                              setPagination(prev => ({ ...prev, current: 1, total: response.total }));
                            }).catch(() => {
                              message.error('获取安全日志失败');
                            }).finally(() => {
                              setSecurityLoading(false);
                            });
                          } else {
                            securityService.getAccessLogs(query).then(response => {
                              setAccessLogs(response.records);
                              setPagination(prev => ({ ...prev, current: 1, total: response.total }));
                            }).catch(() => {
                              message.error('获取安全日志失败');
                            }).finally(() => {
                              setSecurityLoading(false);
                            });
                          }
                        }}
                        loading={securityLoading}
                      >
                        刷新
                      </Button>
                      <Button
                        icon={<ClearOutlined />}
                        type="primary"
                        danger
                        onClick={() => setCleanupModalVisible(true)}
                      >
                        清理旧日志
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>

              {/* 日志表格 */}
              <Table
                columns={logType === 'login_attempts' ? loginAttemptColumns : (accessLogColumns as any)}
                dataSource={logType === 'login_attempts' ? loginAttempts : (accessLogs as any)}
                rowKey="id"
                loading={securityLoading}
                scroll={{ x: 1200 }}
                rowClassName={(record) => {
                  // 为未授权访问日志添加特殊样式
                  if (logType === 'unauthorized_access' || (logType === 'authorized_access' && !(record as AccessLog).username)) {
                    return 'external-access-row';
                  }
                  return '';
                }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                  onChange: (page, pageSize) => {
                    setPagination(prev => ({ ...prev, pageSize: pageSize || 20 }));
                    fetchSecurityLogs(page);
                  },
                }}
              />
            </TabPane>
            </>
          )}
        </Tabs>
      </Card>

      {/* 用户创建/编辑弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={showUserModal}
        onCancel={() => setShowUserModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleSubmitUser}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label={editingUser ? "新密码" : "密码"}
            name="password"
            rules={editingUser ? [] : [{ required: true, message: '请设置密码' }]}
            extra={editingUser ? "留空表示不修改密码" : ""}
          >
            <Input.Password placeholder={editingUser ? "留空表示不修改" : "请设置密码"} />
          </Form.Item>

          <Form.Item
            label={editingUser ? "确认新密码" : "确认密码"}
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const password = getFieldValue('password');
                  if (!password && !value) {
                    // 编辑时，如果密码和确认密码都为空，则验证通过
                    return Promise.resolve();
                  }
                  if (password && !value) {
                    return Promise.reject(new Error('请确认密码'));
                  }
                  if (password !== value) {
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password placeholder={editingUser ? "确认新密码" : "请确认密码"} />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="user">用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>

          <Form.Item label="备注1" name="note1">
            <Input placeholder="请输入备注1" />
          </Form.Item>

          <Form.Item label="备注2" name="note2">
            <TextArea placeholder="请输入备注2" rows={3} />
          </Form.Item>

          <Form.Item label="状态" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingUser ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setShowUserModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 清理日志配置Modal */}
      <Modal
        title="清理日志配置"
        open={cleanupModalVisible}
        onOk={handleCleanupLogs}
        onCancel={() => setCleanupModalVisible(false)}
        okText="确定清理"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          <p>选择要清理的日志范围：</p>
          <Radio.Group
            value={cleanupDays}
            onChange={(e) => setCleanupDays(e.target.value)}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Radio value={7}>清理7天前的日志</Radio>
              <Radio value={30}>清理30天前的日志</Radio>
              <Radio value={90}>清理90天前的日志</Radio>
              <Radio value={180}>清理180天前的日志</Radio>
              <Radio value={365}>清理1年前的日志</Radio>
              <Radio value={0}>清理全部历史日志</Radio>
            </div>
          </Radio.Group>
        </div>

        <div style={{ padding: '12px', backgroundColor: '#fff2e8', border: '1px solid #ffb366', borderRadius: '6px' }}>
          <p style={{ margin: 0, color: '#d46b08' }}>
            <strong>注意：</strong>
            {cleanupDays === 0 ?
              '此操作将删除所有历史日志记录，包括登录记录、访问日志等，且无法恢复！' :
              `此操作将删除${cleanupDays}天前的所有日志记录，包括登录记录、访问日志等，且无法恢复！`
            }
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
