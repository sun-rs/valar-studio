import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Card, Table, Tabs, DatePicker, Button, Space, Tag, Row, Col, Progress, Tooltip, Radio } from 'antd';
import { CalendarOutlined, PlusOutlined, MinusOutlined, UnorderedListOutlined, WarningOutlined } from '@ant-design/icons';
import { ordersService, Order, Trade } from '../../services/orders';
import { accountConfigApi } from '../../services/accountConfig';
import { useRefreshStore } from '../../stores/refreshStore';
import { useAuthStore } from '../../stores/authStore';
import AccountSelector from '../../components/AccountSelector';
import dayjs, { Dayjs } from 'dayjs';
import './index.css';

const { TabPane } = Tabs;

const Orders: React.FC = () => {
  const { setCurrentPage, setOrdersRefresh } = useRefreshStore();
  const user = useAuthStore(state => state.user);
  const lastFetchedUserRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [permittedAccounts, setPermittedAccounts] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isSpecialFilter, setIsSpecialFilter] = useState(false); // 特殊订单筛选开关
  const [accountsLoading, setAccountsLoading] = useState(false);

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
    setAccountsLoading(true);
    try {
      const myAccounts = await accountConfigApi.getMyAccounts();
      const accounts = Array.from(new Set(myAccounts.map(account => account.account_id))).filter(Boolean);
      setPermittedAccounts(accounts);

      setSelectedAccounts(prevSelected => {
        if (accounts.length === 0) {
          return [];
        }

        const validSelected = prevSelected.filter(accountId => accounts.includes(accountId));

        if (validSelected.length > 0) {
          return validSelected;
        }

        return accounts;
      });
    } catch (error) {
      console.error('Failed to fetch permitted accounts:', error);
      setPermittedAccounts([]);
      setSelectedAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage('/orders');
  }, [setCurrentPage]);

  useEffect(() => {
    if (!user) {
      setPermittedAccounts([]);
      setSelectedAccounts([]);
      lastFetchedUserRef.current = null;
      return;
    }

    if (lastFetchedUserRef.current === user.id) {
      return;
    }

    lastFetchedUserRef.current = user.id;
    fetchPermittedAccounts();
  }, [user]);

  // Update refresh function when dependencies change
  const fetchData = useCallback(async () => {
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
  }, [selectedAccounts, selectedDate, isSpecialFilter]);

  useEffect(() => {
    setOrdersRefresh(fetchData);
  }, [fetchData, setOrdersRefresh]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      case '拒单':
        return 'order-rejected';
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
            className="dense-table"
            style={{
              background: 'white',
              border: 'none'
            }}
            scroll={{ x: 'max-content' }}
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
      width: 110,
    },
    {
      title: '交易所',
      dataIndex: 'exchange',
      key: 'exchange',
      width: 90,
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
      width: 90,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '数量',
      dataIndex: 'volume',
      key: 'volume',
      align: 'right' as const,
      width: 70,
    },
    {
      title: '已成交',
      dataIndex: 'traded',
      key: 'traded',
      align: 'right' as const,
      width: 90,
      render: (traded: number, record: Order) => `${traded}/${record.volume}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 160,
    },
    {
      title: '创建时间',
      dataIndex: 'createtime',
      key: 'createtime',
      width: 160,
      ellipsis: true,
      sorter: (a: Order, b: Order) => dayjs(a.createtime).unix() - dayjs(b.createtime).unix(),
      showSorterTooltip: false,
      render: (text: string) => (
        <Tooltip title={dayjs(text).format('YYYY-MM-DD HH:mm:ss')} placement="topRight">
          {dayjs(text).format('MM-DD HH:mm:ss')}
        </Tooltip>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatetime',
      key: 'updatetime',
      width: 160,
      ellipsis: true,
      sorter: (a: Order, b: Order) => dayjs(a.updatetime).unix() - dayjs(b.updatetime).unix(),
      showSorterTooltip: false,
      render: (text: string) => (
        <Tooltip title={dayjs(text).format('YYYY-MM-DD HH:mm:ss')} placement="topRight">
          {dayjs(text).format('MM-DD HH:mm:ss')}
        </Tooltip>
      ),
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
      <div className="orders-toolbar">
        <span className="toolbar-label">筛选条件</span>
        <Space size={12} wrap className="orders-actions">
          <div className="orders-filter-toggle">
            <Radio.Group
              value={isSpecialFilter ? 'special' : 'all'}
              onChange={(e) => setIsSpecialFilter(e.target.value === 'special')}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="all">
                <span className="orders-filter-option">
                  <UnorderedListOutlined />
                  全部订单
                </span>
              </Radio.Button>
              <Radio.Button value="special">
                <span className="orders-filter-option">
                  <WarningOutlined />
                  特殊订单
                </span>
              </Radio.Button>
            </Radio.Group>
          </div>
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="YYYY-MM-DD"
            allowClear={false}
            className="orders-date-picker"
          />
          <Button
            onClick={() => setSelectedDate(dayjs())}
            icon={<CalendarOutlined />}
            className="orders-today-button"
          >
            今日
          </Button>
        </Space>
      </div>

      <div className="orders-body">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <AccountSelector
              accounts={permittedAccounts}
              selectedAccounts={selectedAccounts}
              onChange={setSelectedAccounts}
              loading={accountsLoading}
            />
          </Col>
          <Col span={24}>
            <Card
              className="orders-table-card"
              title={`订单数据 (${selectedAccounts.length}个账户, ${selectedDate.format('YYYY-MM-DD')})`}
            >
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab={`委托单 (${orders.length})`} key="orders">
              <Table
                columns={orderColumns}
                dataSource={orders}
                rowKey="order_id"
                rowClassName={getRowClassName}
                loading={loading}
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="small"
                className="dense-table"
                expandable={{
                  expandedRowRender: renderTradeDetails,
                    rowExpandable: (record) => record.traded > 0,
                    expandRowByClick: true,  // 允许点击整行展开
                    expandIcon: ({ expanded, onExpand, record }) =>
                      record.traded > 0 ? (
                        <span
                          className="orders-expand-icon"
                          onClick={(event) => onExpand(record, event)}
                        >
                          {expanded ? (
                            <MinusOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                          ) : (
                            <PlusOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                          )}
                        </span>
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
                scroll={{ x: 'max-content' }}
                size="small"
                className="dense-table"
              />
            </TabPane>
            </Tabs>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Orders;
