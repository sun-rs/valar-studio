import React, { useEffect, useState, useMemo } from 'react';
import { Card, Table, Tabs, DatePicker, Button, Space, Tag, Row, Col, Progress, Switch } from 'antd';
import { CalendarOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { ordersService, Order, Trade } from '../../services/orders';
import { positionsService } from '../../services/positions';
import { useAuthStore } from '../../stores/authStore';
import { useRefreshStore } from '../../stores/refreshStore';
import AccountSelector from '../../components/AccountSelector';
import dayjs, { Dayjs } from 'dayjs';
import './index.css';

const { TabPane } = Tabs;

const Orders: React.FC = () => {
  const { user } = useAuthStore();
  const { setCurrentPage, setOrdersRefresh } = useRefreshStore();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [permittedAccounts, setPermittedAccounts] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isSpecialFilter, setIsSpecialFilter] = useState(false); // 特殊订单筛选开关

  // Fetch current trade date on mount
  useEffect(() => {
    const getCurrentDate = async () => {
      try {
        const currentDate = await ordersService.getCurrentTradeDate();
        setSelectedDate(dayjs(currentDate));
      } catch (error) {
        console.error('Failed to fetch current trade date:', error);
        // Fallback to today
        setSelectedDate(dayjs());
      }
    };
    getCurrentDate();
  }, []);

  // Fetch permitted accounts from positions summary API
  const fetchPermittedAccounts = async () => {
    try {
      const summaryData = await positionsService.getPositionsSummary();
      const accounts = summaryData.permitted_accounts || [];
      setPermittedAccounts(accounts);

      // Auto-select all accounts by default
      if (selectedAccounts.length === 0 && accounts.length > 0) {
        setSelectedAccounts(accounts);
      }
    } catch (error) {
      console.error('Failed to fetch permitted accounts:', error);
    }
  };

  useEffect(() => {
    fetchPermittedAccounts();
    // Set current page and refresh function
    setCurrentPage('/orders');
    setOrdersRefresh(fetchData);
  }, []);

  // Update refresh function when dependencies change
  useEffect(() => {
    setOrdersRefresh(fetchData);
  }, [selectedAccounts, selectedDate]);

  const fetchData = async () => {
    if (selectedAccounts.length === 0) {
      setOrders([]);
      setTrades([]);
      return;
    }

    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');

      // Always use accounts array for consistent API calls
      const [ordersData, tradesData] = await Promise.all([
        ordersService.getOrders(undefined, selectedAccounts, dateStr, isSpecialFilter ? true : undefined),
        ordersService.getTrades(undefined, selectedAccounts, dateStr),
      ]);

      setOrders(ordersData);
      setTrades(tradesData);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAccounts, selectedDate, isSpecialFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '全部成交':
        return 'success';
      case '部分成交':
        return 'warning';
      case '已撤销':
        return 'default';
      case '拒单':
        return 'error';
      default:
        return 'processing';
    }
  };

  const getRowClassName = (record: Order) => {
    switch (record.status) {
      case '全部成交':
        return 'order-filled';
      case '部分成交':
        return 'order-partial';
      case '已撤销':
        return 'order-cancelled';
      default:
        return '';
    }
  };

  // 根据订单ID和账户ID获取对应的成交记录
  const getTradesByOrderId = useMemo(() => {
    const tradeMap = new Map<string, Trade[]>();
    trades.forEach(trade => {
      const key = `${trade.order_id}_${trade.accountid}`;
      if (!tradeMap.has(key)) {
        tradeMap.set(key, []);
      }
      tradeMap.get(key)!.push(trade);
    });
    return tradeMap;
  }, [trades]);

  // 展开行内容渲染函数
  const renderTradeDetails = (record: Order) => {
    const key = `${record.order_id}_${record.accountid}`;
    const orderTrades = (getTradesByOrderId.get(key) || [])
      .sort((a, b) => {
        // 首先按创建时间降序排序（最新的在前）
        const timeComparison = dayjs(b.createtime).unix() - dayjs(a.createtime).unix();
        if (timeComparison !== 0) return timeComparison;
        // 如果时间相同，按tradeid降序排序
        return b.tradeid.localeCompare(a.tradeid);
      });

    if (orderTrades.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
          该委托单暂无成交记录
        </div>
      );
    }

    // 计算成交统计
    const totalTraded = orderTrades.reduce((sum, trade) => sum + trade.volume, 0);
    const remainingVolume = record.volume - record.traded;
    const tradeProgress = (record.traded / record.volume) * 100;

    // 成交明细表格列配置
    const expandedTradeColumns = [
      {
        title: '成交价',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        align: 'right' as const,
        render: (value: number) => value.toFixed(2),
      },
      {
        title: '成交量',
        dataIndex: 'volume',
        key: 'volume',
        width: 80,
        align: 'right' as const,
      },
      {
        title: '成交时间',
        dataIndex: 'createtime',
        key: 'createtime',
        width: 160,
        render: (text: string) => dayjs(text).format('MM-DD HH:mm:ss'),
      },
      {
        title: '成交编号',
        dataIndex: 'tradeid',
        key: 'tradeid',
        width: 180,
      },
    ];

    return (
      <div style={{
        padding: '8px 0',
        background: '#fafafa'
      }}>
        {/* 成交明细表格 */}
        <div style={{ padding: '0 12px' }}>
          <Table
            columns={expandedTradeColumns}
            dataSource={orderTrades}
            rowKey="tradeid"
            pagination={false}
            size="small"
            style={{
              background: 'white',
              border: 'none'
            }}
            scroll={{ x: 520 }}
            bordered={false}
          />
        </div>

        {/* 进度条作为下边框 */}
        <Progress
          percent={tradeProgress}
          size="small"
          status={record.status === '全部成交' ? 'success' : 'active'}
          format={(percent) => `${percent?.toFixed(1)}%`}
          strokeWidth={8}
          style={{ marginTop: '8px' }}
        />
      </div>
    );
  };

  const orderColumns = [
    {
      title: '账户',
      dataIndex: 'accountid',
      key: 'accountid',
      width: 100,
    },
    {
      title: '合约代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '交易所',
      dataIndex: 'exchange',
      key: 'exchange',
      width: 100,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (dir: string) => (
        <Tag color={dir === 'long' ? 'red' : 'green'}>
          {dir === 'long' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '开平',
      dataIndex: 'offset',
      key: 'offset',
      width: 80,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      align: 'right' as const,
      width: 100,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '数量',
      dataIndex: 'volume',
      key: 'volume',
      align: 'right' as const,
      width: 80,
    },
    {
      title: '已成交',
      dataIndex: 'traded',
      key: 'traded',
      align: 'right' as const,
      width: 80,
      render: (traded: number, record: Order) => `${traded}/${record.volume}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 200,
    },
    {
      title: '创建时间',
      dataIndex: 'createtime',
      key: 'createtime',
      width: 180,
      sorter: (a: Order, b: Order) => dayjs(a.createtime).unix() - dayjs(b.createtime).unix(),
      showSorterTooltip: false,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatetime',
      key: 'updatetime',
      width: 180,
      sorter: (a: Order, b: Order) => dayjs(a.updatetime).unix() - dayjs(b.updatetime).unix(),
      showSorterTooltip: false,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const tradeColumns = [
    {
      title: '账户',
      dataIndex: 'accountid',
      key: 'accountid',
      width: 100,
    },
    {
      title: '合约代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '交易所',
      dataIndex: 'exchange',
      key: 'exchange',
      width: 100,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (dir: string) => (
        <Tag color={dir === 'long' ? 'red' : 'green'}>
          {dir === 'long' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '开平',
      dataIndex: 'offset',
      key: 'offset',
      width: 80,
    },
    {
      title: '成交价',
      dataIndex: 'price',
      key: 'price',
      align: 'right' as const,
      width: 100,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      align: 'right' as const,
      width: 80,
    },
    {
      title: '成交号',
      dataIndex: 'tradeid',
      key: 'tradeid',
      width: 200,
    },
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 200,
    },
    {
      title: '成交时间',
      dataIndex: 'createtime',
      key: 'createtime',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div className="orders">
      <div className="orders-header">
        <h2>订单管理</h2>
        <Space>
          <Switch
            checked={isSpecialFilter}
            onChange={setIsSpecialFilter}
            checkedChildren="特殊"
            unCheckedChildren="全部"
            size="small"
          />
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button
            onClick={() => setSelectedDate(dayjs())}
            icon={<CalendarOutlined />}
          >
            今日
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <AccountSelector
            accounts={permittedAccounts}
            selectedAccounts={selectedAccounts}
            onChange={setSelectedAccounts}
            loading={false}
          />
        </Col>
        <Col span={24}>
          <Card title={`订单数据 (${selectedAccounts.length}个账户, ${selectedDate.format('YYYY-MM-DD')})`}>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab={`委托单 (${orders.length})`} key="orders">
                <Table
                  columns={orderColumns}
                  dataSource={orders}
                  rowKey="order_id"
                  rowClassName={getRowClassName}
                  loading={loading}
                  pagination={false}
                  scroll={{ x: 1500 }}
                  size="middle"
                  expandable={{
                    expandedRowRender: renderTradeDetails,
                    rowExpandable: (record) => record.traded > 0,
                    expandRowByClick: true,  // 允许点击整行展开
                    expandIcon: ({ expanded, onExpand, record }) =>
                      record.traded > 0 ? (
                        expanded ? (
                          <MinusOutlined
                            style={{ color: '#1890ff', fontSize: '12px' }}
                          />
                        ) : (
                          <PlusOutlined
                            style={{ color: '#1890ff', fontSize: '12px' }}
                          />
                        )
                      ) : null  // 无成交记录不显示图标
                  }}
                  onRow={(record) => ({
                    style: {
                      cursor: record.traded > 0 ? 'pointer' : 'default',
                    },
                    title: record.traded > 0 ? '点击查看成交明细' : undefined,
                  })}
                />
              </TabPane>
              <TabPane tab={`成交单 (${trades.length})`} key="trades">
                <Table
                  columns={tradeColumns}
                  dataSource={trades}
                  rowKey="tradeid"
                  loading={loading}
                  pagination={false}
                  scroll={{ x: 1300 }}
                  size="middle"
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Orders;