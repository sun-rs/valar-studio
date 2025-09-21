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
  Tag
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  KeyOutlined,
  TeamOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { settingsService } from '../../services/settings';
import type { ColumnsType } from 'antd/es/table';
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

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

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
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString() : '未登录',
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

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>设置 - 用户管理中心</h2>
      </div>

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
    </div>
  );
};

export default Settings;