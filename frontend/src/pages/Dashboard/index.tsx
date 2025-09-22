import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Space, Spin, Select, Tooltip } from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  BankOutlined,
  WalletOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { dashboardService, DashboardSummary, AccountSummary, AccountHistoryData } from '../../services/dashboard';
import { useRefreshStore } from '../../stores/refreshStore';
import { useStatCardClasses, useRowChangeClasses } from '../../hooks/useValueChange';
import dayjs from 'dayjs';
import './index.css';

const Dashboard: React.FC = () => {
  const { setDashboardRefresh } = useRefreshStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<AccountHistoryData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(3);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryData, accountsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getAccounts(),
      ]);
      setSummary(summaryData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    if (!selectedAccountForHistory) {
      setHistoryData([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const historyResult = await dashboardService.getAccountsHistory([selectedAccountForHistory], historyDays);
      setHistoryData(historyResult);
    } catch (error) {
      console.error('Failed to fetch history data:', error);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 不默认获取历史数据，提高刷新效率
    // Register this page's refresh function
    setDashboardRefresh(() => {
      fetchData();
      // 如果有选中账户才刷新历史数据
      if (selectedAccountForHistory) {
        fetchHistoryData();
      }
    });
  }, [setDashboardRefresh, selectedAccountForHistory]);

  useEffect(() => {
    fetchHistoryData();
  }, [historyDays, selectedAccountForHistory]);

  // 货币格式化工具
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
      }),
    []
  );

  const compactCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        notation: 'compact',
        maximumFractionDigits: 2,
      }),
    []
  );

  const currencyIntegerFormatter = useMemo(
    () =>
      new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatCurrency = (value: number) => currencyFormatter.format(value);
  const formatCompactCurrency = (value: number) => compactCurrencyFormatter.format(value);

  const renderSummaryCurrency = (value: number) => {
    const numericValue = Number.isFinite(value) ? value : 0;
    const roundedValue = Math.round(numericValue);
    const parts = currencyIntegerFormatter.formatToParts(roundedValue);

    const sign = parts
      .filter(part => part.type === 'minusSign')
      .map(part => part.value)
      .join('');
    const symbol = parts
      .filter(part => part.type === 'currency')
      .map(part => part.value)
      .join('');
    const number = parts
      .filter(part => part.type === 'integer' || part.type === 'group')
      .map(part => part.value)
      .join('');

    return (
      <span className="summary-currency">
        {sign && <span className="summary-currency-sign">{sign}</span>}
        {symbol && <span className="summary-currency-symbol">{symbol}</span>}
        <span className="summary-currency-value">{number}</span>
      </span>
    );
  };

  const formatPercent = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) {
      return '-';
    }

    let numericValue: number;

    if (typeof value === 'string') {
      const cleaned = value.replace(/%/g, '').trim();
      if (!cleaned) {
        return '-';
      }
      const parsed = Number(cleaned);
      if (!Number.isFinite(parsed)) {
        return '-';
      }

      numericValue = parsed;
      // 如果字符串本身不包含百分号且绝对值≤1，视为小数比例，乘以100
      if (!value.includes('%') && Math.abs(parsed) <= 1) {
        numericValue = parsed * 100;
      }
    } else {
      numericValue = value;
      // 当为小数比例时转换为百分比
      if (Math.abs(numericValue) <= 1) {
        numericValue = numericValue * 100;
      }
    }

    if (!Number.isFinite(numericValue)) {
      return '-';
    }

    return `${numericValue.toFixed(2)}%`;
  };

  const columns = [
    {
      title: '账户ID',
      dataIndex: 'account_id',
      key: 'account_id',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: '账户名称',
      dataIndex: 'account_name',
      key: 'account_name',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: formatCurrency,
    },
    {
      title: '浮动盈亏',
      dataIndex: 'float_pnl',
      key: 'float_pnl',
      align: 'right' as const,
      render: (value: number) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return '-';
        }
        const display = formatCompactCurrency(numericValue);
        const title = formatCurrency(numericValue);
        return (
          <Tooltip title={title} placement="topRight">
            <span className={`numeric-cell ${numericValue >= 0 ? 'text-profit' : 'text-loss'}`}>{display}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '总盈亏',
      dataIndex: 'total_pnl',
      key: 'total_pnl',
      align: 'right' as const,
      render: (value: number) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return '-';
        }
        const display = formatCompactCurrency(numericValue);
        const title = formatCurrency(numericValue);
        return (
          <Tooltip title={title} placement="topRight">
            <span className={`numeric-cell ${numericValue >= 0 ? 'text-profit' : 'text-loss'}`}>{display}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '收益率',
      dataIndex: 'profit_rate',
      key: 'profit_rate',
      align: 'right' as const,
      render: (value: number | string) => {
        const content = formatPercent(value);
        if (content === '-') {
          return <span className="numeric-cell">-</span>;
        }
        const numericValue = Number(
          typeof value === 'string' ? value.replace(/%/g, '').trim() : value
        );
        const isPositive = Number.isFinite(numericValue) ? numericValue >= 0 : true;
        return (
          <span className={`numeric-cell ${isPositive ? 'text-profit' : 'text-loss'}`}>{content}</span>
        );
      },
    },
    {
      title: '保证金',
      dataIndex: 'margin',
      key: 'margin',
      align: 'right' as const,
      render: (value: number) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return '-';
        }
        return (
          <Tooltip title={formatCurrency(numericValue)} placement="topRight">
            <span className="numeric-cell">{formatCompactCurrency(numericValue)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '保证金率',
      dataIndex: 'margin_rate',
      key: 'margin_rate',
      align: 'right' as const,
      render: (value: number | string) => {
        const content = formatPercent(value);
        return <span className="numeric-cell">{content}</span>;
      },
    },
    {
      title: '可用资金',
      dataIndex: 'available',
      key: 'available',
      align: 'right' as const,
      render: (value: number) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return '-';
        }
        return (
          <Tooltip title={formatCurrency(numericValue)} placement="topRight">
            <span className="numeric-cell">{formatCompactCurrency(numericValue)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '初始资金',
      dataIndex: 'initial_capital',
      key: 'initial_capital',
      align: 'right' as const,
      render: (value: number) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return '-';
        }
        return (
          <Tooltip title={formatCurrency(numericValue)} placement="topRight">
            <span className="numeric-cell">{formatCompactCurrency(numericValue)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'update_time',
      key: 'update_time',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  // 生成资金曲线图配置
  const getHistoryChartOption = () => {
    if (!historyData || historyData.length === 0) {
      return null;
    }

    const accountHistory = historyData[0]; // 只取第一个账户的数据
    if (!accountHistory || !accountHistory.data || accountHistory.data.length === 0) {
      return null;
    }

    // 计算Y轴范围，添加适当的上下边距
    const balances = accountHistory.data.map(point => point.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const range = maxBalance - minBalance;
    const padding = Math.max(range * 0.1, 1000); // 至少1000元的边距

    // 为X轴准备分类数据（只包含有数据的时间点）
    const timeLabels = accountHistory.data.map(point => point.updatetime);
    const balanceValues = accountHistory.data.map(point => point.balance);

    const series = [{
      name: `账户 ${accountHistory.account_id}`,
      type: 'line',
      data: balanceValues,
      smooth: true,
      symbol: 'none',  // 隐藏数据点
      lineStyle: {
        width: 3,
        color: '#1890ff'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
          ]
        }
      }
    }];

    // 获取选中账户的名称
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0];
          const timeLabel = timeLabels[param.dataIndex];
          const value = new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2,
          }).format(param.value);
          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${dayjs(timeLabel).format('YYYY-MM-DD HH:mm:ss')}</div>
            <div style="color: ${param.color};">账户余额: ${value}</div>
          `;
        },
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: 'transparent',
        textStyle: {
          color: '#fff'
        },
        borderRadius: 8
      },
      grid: {
        top: 20,
        left: 10,
        right: 10,
        bottom: 48,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: {
          formatter: (value: any, index: number) => {
            // 智能显示策略：根据数据点数量决定显示密度
            const totalPoints = timeLabels.length;
            let showEvery = 1;

            if (totalPoints > 50) {
              showEvery = Math.ceil(totalPoints / 20); // 最多显示20个标签
            } else if (totalPoints > 20) {
              showEvery = Math.ceil(totalPoints / 15); // 最多显示15个标签
            } else if (totalPoints > 10) {
              showEvery = 2; // 每隔一个显示
            }

            if (index % showEvery === 0 || index === totalPoints - 1) {
              const time = dayjs(value);
              // 根据时间跨度决定显示格式
              if (historyDays <= 1) {
                return time.format('HH:mm');
              } else if (historyDays <= 7) {
                return time.format('MM-DD HH:mm');
              } else {
                return time.format('MM-DD');
              }
            }
            return '';
          },
          rotate: 45,
          fontSize: 10,
          color: '#666'
        },
        axisLine: {
          lineStyle: {
            color: '#d0d7de'
          }
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        min: Math.floor(minBalance - padding),
        max: Math.ceil(maxBalance + padding),
        axisLabel: {
          formatter: (value: number) => {
            if (Math.abs(value) >= 10000) {
              return `${(value / 10000).toFixed(1)}万`;
            }
            return value.toLocaleString();
          },
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: '#d0d7de'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f0f3f6',
            type: 'dashed'
          }
        }
      },
      series: series,
      animation: true,
      animationDuration: 1000
    };
  };

  return (
    <div className="dashboard">
      <Spin spinning={loading && !summary}>
        <Row gutter={[16, 16]} className="summary-cards">
          <Col xs={24} sm={12} lg={6}>
            <Card
              className={useStatCardClasses(summary?.total_balance)}
              title={
                <div className="summary-card-header">
                  <DollarOutlined className="summary-card-icon" style={{ color: '#1890ff' }} />
                  <span>总资产</span>
                </div>
              }
            >
              <Statistic
                title={null}
                value={summary?.total_balance || 0}
                formatter={(value) => renderSummaryCurrency(Number(value))}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              className={useStatCardClasses(summary?.net_profit)}
              title={
                <div className="summary-card-header">
                  <RiseOutlined
                    className="summary-card-icon"
                    style={{ color: (summary?.net_profit || 0) >= 0 ? '#f5222d' : '#52c41a' }}
                  />
                  <span>净利润</span>
                </div>
              }
            >
              <Statistic
                title={null}
                value={summary?.net_profit || 0}
                formatter={(value) => renderSummaryCurrency(Number(value))}
                valueStyle={{
                  color: (summary?.net_profit || 0) >= 0 ? '#f5222d' : '#52c41a', // 中国市场：正数红色，负数绿色
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              className={useStatCardClasses(summary?.total_margin)}
              title={
                <div className="summary-card-header">
                  <BankOutlined className="summary-card-icon" style={{ color: '#faad14' }} />
                  <span>总保证金</span>
                </div>
              }
            >
              <Statistic
                title={null}
                value={summary?.total_margin || 0}
                formatter={(value) => renderSummaryCurrency(Number(value))}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              className={useStatCardClasses(summary?.available_funds)}
              title={
                <div className="summary-card-header">
                  <WalletOutlined className="summary-card-icon" style={{ color: '#722ed1' }} />
                  <span>可用资金</span>
                </div>
              }
            >
              <Statistic
                title={null}
                value={summary?.available_funds || 0}
                formatter={(value) => renderSummaryCurrency(Number(value))}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Card title="账户明细" className="accounts-table">
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="account_id"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          size="small"
          className="dense-table"
          rowClassName={(record) => useRowChangeClasses(record.balance)}
        />
      </Card>

      <Card
        className="history-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <LineChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              资金曲线
            </div>
            <Space size={16}>
              <Select
                value={selectedAccountForHistory}
                onChange={setSelectedAccountForHistory}
                size="small"
                style={{ width: 120 }}
                placeholder="选择账户"
                allowClear
                options={[
                  { value: undefined, label: '无选择' },
                  ...accounts.map(acc => ({
                    value: acc.account_id,
                    label: acc.account_id
                  }))
                ]}
              />
              <Select
                value={historyDays}
                onChange={setHistoryDays}
                size="small"
                style={{ width: 80 }}
                options={[
                  { value: 1, label: '1天' },
                  { value: 3, label: '3天' },
                  { value: 5, label: '5天' },
                  { value: 7, label: '7天' },
                  { value: 15, label: '15天' },
                  { value: 30, label: '30天' }
                ]}
              />
            </Space>
          </div>
        }
      >
        <Spin spinning={historyLoading}>
          {!selectedAccountForHistory ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <LineChartOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <p style={{ fontSize: 16, marginBottom: 8 }}>请选择要查看的账户</p>
              <p style={{ fontSize: 14 }}>
                选择一个账户来查看其资金变化曲线
              </p>
            </div>
          ) : historyData && historyData.length > 0 && historyData[0]?.data?.length > 0 ? (
            <ReactECharts
              option={getHistoryChartOption()}
              style={{ height: '400px', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <LineChartOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <p style={{ fontSize: 16, marginBottom: 8 }}>暂无历史数据</p>
              <p style={{ fontSize: 14 }}>
                {historyLoading ? '正在加载历史数据...' : `账户 ${selectedAccountForHistory} 近${historyDays}天内没有资金变化记录`}
              </p>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Dashboard;
