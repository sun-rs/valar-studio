import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Space,
  Tag,
  Radio,
  Checkbox,
  Row,
  Col,
  Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { accountConfigApi, AccountConfig as AccountConfigType, AccountPermission as AccountPermissionRecord } from '../../services/accountConfig';
import { settingsService, User as SettingsUser } from '../../services/settings';
import type { ColumnsType } from 'antd/es/table';
import './index.css';

const { TabPane } = Tabs;
const { TextArea } = Input;

type AccountPermission = AccountPermissionRecord & {
  username?: string;
  account_name?: string;
};

const AccountConfig: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('my-accounts');
  const [accounts, setAccounts] = useState<AccountConfigType[]>([]);
  const [permissions, setPermissions] = useState<AccountPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountConfigType | null>(null);
  const [form] = Form.useForm();

  // 权限分配相关状态
  const [allUsers, setAllUsers] = useState<SettingsUser[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountConfigType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadMyAccounts();
    // 所有用户都默认显示"我的交易账户"标签页
  }, [isAdmin]);

  const loadMyAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountConfigApi.getMyAccounts();
      setAccounts(data);
    } catch (error) {
      message.error('加载账户失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAllAccounts = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await accountConfigApi.getAllAccounts();
      setAccounts(data);
    } catch (error) {
      message.error('加载账户失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await accountConfigApi.getPermissions();
      setPermissions(data);
    } catch (error) {
      message.error('加载权限失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载用户列表和所有账户（权限分配用）
  const loadUsersAndAccounts = async () => {
    if (!isAdmin) return;
    setPermissionLoading(true);
    try {
      const [usersData, accountsData] = await Promise.all([
        settingsService.getUsers(),
        accountConfigApi.getAllAccounts()
      ]);
      setAllUsers(usersData);
      setAllAccounts(accountsData);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  // 加载特定用户的权限
  const loadUserPermissions = async (userId: number) => {
    if (!isAdmin) return;
    setPermissionLoading(true);
    try {
      const accountIds = await accountConfigApi.getUserPermissions(userId);
      setSelectedAccountIds(accountIds);
    } catch (error) {
      message.error('加载用户权限失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  // 处理用户选择
  const handleUserSelect = (e: any) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
    if (userId) {
      loadUserPermissions(userId);
    } else {
      setSelectedAccountIds([]);
    }
  };

  // 保存权限配置
  const handleSavePermissions = async () => {
    if (!selectedUserId) {
      message.warning('请先选择用户');
      return;
    }

    setPermissionLoading(true);
    try {
      // 使用新的API设置用户权限
      await accountConfigApi.setUserPermissions(selectedUserId, selectedAccountIds);

      message.success('权限配置保存成功');
      // 重新加载权限数据
      loadPermissions();
    } catch (error) {
      message.error('保存权限配置失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditAccount = (account: AccountConfigType) => {
    setEditingAccount(account);
    form.setFieldsValue({
      ...account,
      tags: account.tags?.join(', ') || '',
    });
    setModalVisible(true);
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await accountConfigApi.deleteAccount(accountId);
      message.success('账户删除成功');
      loadAllAccounts();
    } catch (error) {
      message.error('删除账户失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const accountData = {
        ...values,
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      };

      if (editingAccount) {
        await accountConfigApi.updateAccount(editingAccount.account_id, accountData);
        message.success('账户更新成功');
      } else {
        await accountConfigApi.createAccount(accountData);
        message.success('账户创建成功');
      }

      setModalVisible(false);
      loadAllAccounts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    switch (key) {
      case 'my-accounts':
        loadMyAccounts();
        break;
      case 'all-accounts':
        loadAllAccounts();
        break;
      case 'permissions':
        loadPermissions();
        loadUsersAndAccounts(); // 同时加载用户和账户数据
        break;
    }
  };

  const accountColumns: ColumnsType<AccountConfigType> = [
    {
      title: '账户ID',
      dataIndex: 'account_id',
      key: 'account_id',
      width: 150,
    },
    {
      title: '账户名称',
      dataIndex: 'account_name',
      key: 'account_name',
      width: 150,
    },
    {
      title: '初始资金',
      dataIndex: 'initial_capital',
      key: 'initial_capital',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '货币',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
    },
    {
      title: '经纪商',
      dataIndex: 'broker',
      key: 'broker',
      width: 120,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <>
          {tags?.map((tag) => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
        </>
      ),
    },
  ];

  if (isAdmin) {
    accountColumns.push({
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAccount(record)}
          />
          <Popconfirm
            title="确定删除这个账户吗？"
            onConfirm={() => handleDeleteAccount(record.account_id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    });
  }

  const permissionColumns: ColumnsType<AccountPermission> = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record: AccountPermission) => (
        <div>
          <strong>{username}</strong>
          <br />
          <span style={{ fontSize: '12px', color: '#666' }}>ID: {record.user_id}</span>
        </div>
      ),
    },
    {
      title: '交易账户',
      dataIndex: 'account_id',
      key: 'account_id',
      width: 200,
      render: (accountId: string, record: AccountPermission) => (
        <div>
          <strong>{accountId}</strong>
          {record.account_name && (
            <>
              <br />
              <span style={{ fontSize: '12px', color: '#666' }}>{record.account_name}</span>
            </>
          )}
        </div>
      ),
    },
    {
      title: '权限类型',
      dataIndex: 'permission_type',
      key: 'permission_type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'view' ? 'blue' : 'green'}>
          {type === 'view' ? '查阅' : '交易'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div className="account-config">
      <Card className="account-config-content">
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="我的交易账户" key="my-accounts">
            <Table
              columns={accountColumns.filter(col => col.key !== 'actions')}
              dataSource={accounts}
              rowKey="account_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          {isAdmin && (
            <TabPane tab="交易账户管理" key="all-accounts">
              <div style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateAccount}
                >
                  创建交易账户
                </Button>
              </div>
              <Table
                columns={accountColumns}
                dataSource={accounts}
                rowKey="account_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          )}

          {isAdmin && (
            <TabPane tab="权限分配" key="permissions">
              <Spin spinning={permissionLoading}>
                <Row gutter={24}>
                  <Col xs={24} md={8}>
                    <Card title="选择用户" className="account-config-panel" style={{ marginBottom: 16 }}>
                      <Radio.Group value={selectedUserId} onChange={handleUserSelect}>
                        <Space direction="vertical">
                          {allUsers.map(user => (
                            <Radio key={user.id} value={user.id}>
                              {user.username} ({user.role === 'admin' ? '管理员' : '用户'})
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    </Card>
                  </Col>

                  <Col xs={24} md={16}>
                    <Card
                      title="分配交易账户"
                      className="account-config-panel"
                      style={{ marginBottom: 16 }}
                      extra={
                        <Button
                          type="primary"
                          onClick={handleSavePermissions}
                          disabled={!selectedUserId}
                          loading={permissionLoading}
                        >
                          保存权限配置
                        </Button>
                      }
                    >
                      {selectedUserId ? (
                        <Checkbox.Group
                          value={selectedAccountIds}
                          onChange={setSelectedAccountIds}
                          className="account-config-checkbox-group"
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {allAccounts.map(account => (
                              <Checkbox key={account.account_id} value={account.account_id} className="account-config-checkbox">
                                <strong>{account.account_id}</strong>
                                {account.account_name && ` - ${account.account_name}`}
                                <br />
                                <span className="account-config-checkbox-meta">
                                  初始资金: ¥{account.initial_capital.toLocaleString()} |
                                  经纪商: {account.broker || '未设置'}
                                </span>
                              </Checkbox>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      ) : (
                        <div className="account-config-empty">
                          请先选择左侧的用户
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* 显示当前权限配置的表格 */}
                <Card title="当前权限配置" style={{ marginTop: 16 }}>
                  <Table
                    columns={permissionColumns}
                    dataSource={permissions}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                  />
                </Card>
              </Spin>
            </TabPane>
          )}
        </Tabs>
      </Card>

      <Modal
        title={editingAccount ? '编辑交易账户' : '创建交易账户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="account_id"
            label="账户ID"
            rules={[{ required: true, message: '请输入账户ID' }]}
          >
            <Input disabled={!!editingAccount} placeholder="请输入账户ID" />
          </Form.Item>

          <Form.Item
            name="account_name"
            label="账户名称"
          >
            <Input placeholder="请输入账户名称" />
          </Form.Item>

          <Form.Item
            name="initial_capital"
            label="初始资金"
            rules={[{ required: true, message: '请输入初始资金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入初始资金"
              formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\¥\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="currency"
            label="货币"
            initialValue="CNY"
          >
            <Select>
              <Select.Option value="CNY">CNY</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="broker"
            label="经纪商"
          >
            <Input placeholder="请输入经纪商" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            extra="多个标签用逗号分隔"
          >
            <Input placeholder="例如：生产环境,主要账户" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountConfig;
