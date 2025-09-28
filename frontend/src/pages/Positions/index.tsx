import React, { useEffect, useState, useMemo } from 'react';
import { Card, Table, Radio, Tag, Spin, Row, Col, Tooltip } from 'antd';
import ReactECharts from 'echarts-for-react';
import { positionsService, Position } from '../../services/positions';
import { accountConfigApi } from '../../services/accountConfig';
import { useRefreshStore } from '../../stores/refreshStore';
import AccountSelector from '../../components/AccountSelector';
import dayjs from 'dayjs';
import './index.css';

const Positions: React.FC = () => {
  const { setCurrentPage, setPositionsRefresh } = useRefreshStore();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'heatmap' | 'chart'>('table');
  const [positions, setPositions] = useState<Position[]>([]);
  const [permittedAccounts, setPermittedAccounts] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const fetchPermittedAccounts = async () => {
    setAccountsLoading(true);
    try {
      const myAccounts = await accountConfigApi.getMyAccounts();
      const accounts = myAccounts.map(account => account.account_id);
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
    }
    setAccountsLoading(false);
  };

  const fetchPositions = async () => {
    if (selectedAccounts.length === 0) {
      setPositions([]);
      return;
    }

    setLoading(true);
    try {
      // Always use accounts array for consistent API calls
      const data = await positionsService.getPositions(undefined, selectedAccounts);
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await fetchPermittedAccounts();
    await fetchPositions();
  };

  useEffect(() => {
    fetchPermittedAccounts();
    // Set current page and refresh function
    setCurrentPage('/positions');
    setPositionsRefresh(fetchData);
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [selectedAccounts]);

  // Update refresh function when dependencies change
  useEffect(() => {
    setPositionsRefresh(fetchPositions);
  }, [selectedAccounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getColumns = () => {
    const baseColumns = [];

    // Always add account column for consistent table headers
    baseColumns.push({
      title: '账户',
      dataIndex: 'accountid',
      key: 'accountid',
      width: 100,
      sorter: (a: Position, b: Position) => (a.accountid || '').localeCompare(b.accountid || ''),
    });

    baseColumns.push(
      {
        title: '合约代码',
        dataIndex: 'code',
        key: 'code',
        fixed: 'left' as const,
        width: 120,
        sorter: (a: Position, b: Position) => a.code.localeCompare(b.code),
      },
      {
        title: '品种名称',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        sorter: (a: Position, b: Position) => a.name.localeCompare(b.name),
      },
      {
        title: '交易所',
        dataIndex: 'exchange',
        key: 'exchange',
        width: 100,
        sorter: (a: Position, b: Position) => a.exchange.localeCompare(b.exchange),
      },
      {
        title: '方向',
        dataIndex: 'direction',
        key: 'direction',
        width: 80,
        sorter: (a: Position, b: Position) => a.direction.localeCompare(b.direction),
        render: (direction: string) => (
          <Tag color={direction === '多' ? 'red' : 'green'}>
            {direction}
          </Tag>
        ),
      },
      {
        title: '持仓量',
        dataIndex: 'volume',
        key: 'volume',
        align: 'right' as const,
        width: 100,
        sorter: (a: Position, b: Position) => a.volume - b.volume,
      },
      {
        title: '开仓价',
        dataIndex: 'open_price',
        key: 'open_price',
        align: 'right' as const,
        width: 120,
        sorter: (a: Position, b: Position) => a.open_price - b.open_price,
        render: (value: number) => value.toFixed(2),
      },
      {
        title: '最新价',
        dataIndex: 'current_price',
        key: 'current_price',
        align: 'right' as const,
        width: 120,
        sorter: (a: Position, b: Position) => a.current_price - b.current_price,
        render: (value: number) => value.toFixed(2),
      },
      {
        title: '浮动盈亏',
        dataIndex: 'float_pnl',
        key: 'float_pnl',
        align: 'right' as const,
        width: 150,
        sorter: (a: Position, b: Position) => a.float_pnl - b.float_pnl,
        render: (value: number) => (
          <span className={value >= 0 ? 'text-profit' : 'text-loss'}>
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        title: '盯市盈亏',
        dataIndex: 'pnl',
        key: 'pnl',
        align: 'right' as const,
        width: 150,
        sorter: (a: Position, b: Position) => a.pnl - b.pnl,
        render: (value: number) => (
          <span className={value >= 0 ? 'text-profit' : 'text-loss'}>
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        title: '保证金',
        dataIndex: 'margin',
        key: 'margin',
        align: 'right' as const,
        width: 150,
        sorter: (a: Position, b: Position) => a.margin - b.margin,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '冻结',
        dataIndex: 'frozen',
        key: 'frozen',
        align: 'right' as const,
        width: 100,
        sorter: (a: Position, b: Position) => a.frozen - b.frozen,
      },
      {
        title: '更新时间',
        dataIndex: 'updatetime',
        key: 'updatetime',
        width: 160,
        ellipsis: true,
        align: 'right' as const,
        sorter: (a: Position, b: Position) => new Date(a.updatetime).getTime() - new Date(b.updatetime).getTime(),
        showSorterTooltip: false,
        render: (text: string) => (
          <Tooltip title={dayjs(text).format('YYYY-MM-DD HH:mm:ss')} placement="topRight">
            {dayjs(text).format('MM-DD HH:mm:ss')}
          </Tooltip>
        ),
      }
    );

    return baseColumns;
  };

  // 准备热力图数据
  const processedHeatmapData = useMemo(() => {
    if (!positions.length) return { data: [], max: 0 };

    // 按行业分组
    const industryMap = new Map<string, Position[]>();

    positions.forEach(pos => {
      const industry = pos.industry || '其他';
      if (!industryMap.has(industry)) {
        industryMap.set(industry, []);
      }
      industryMap.get(industry)!.push(pos);
    });

    // 生成基于盈利率的颜色函数 - 收益/亏损越大颜色越鲜亮，接近0%使用深暗色
    const getProfitRateColor = (pnl: number, margin: number) => {
      if (margin === 0) return '#2a2a2a'; // 深灰色

      const profitRate = (pnl / margin) * 100; // 盈利率百分比

      // 绝对0%为深暗灰色
      if (profitRate === 0) {
        return '#2a2a2a';
      }

      if (profitRate > 0) {
        // 正盈利：从深暗红到鲜亮红 - 盈利越大越鲜亮，加深高盈利颜色
        if (profitRate >= 50) return '#FF0000';      // 鲜亮纯红：>=50%
        if (profitRate >= 20) return '#FF3030';      // 更亮红：20%-50%
        if (profitRate >= 10) return '#E53935';      // 中红：10%-20%
        if (profitRate >= 5) return '#C62828';       // 中暗红：5%-10%
        return '#8D1E1E';                            // 深暗红：0%-5%
      } else {
        // 亏损：从深暗绿到鲜亮绿 - 亏损越大越鲜亮，使用纯正的绿色系
        if (profitRate <= -50) return '#00FF00';     // 鲜亮纯绿：<=-50%
        if (profitRate <= -20) return '#00CC00';     // 亮绿：-50%到-20%
        if (profitRate <= -10) return '#228B22';     // 森林绿：-20%到-10%
        if (profitRate <= -5) return '#006400';      // 暗绿：-10%到-5%
        return '#003300';                            // 深暗绿：-5%到0%
      }
    };

    // 转换为treemap格式
    const data = Array.from(industryMap.entries()).map(([industry, industryPositions]) => ({
      name: industry,
      children: industryPositions.map(pos => {
        const margin = pos.margin || 0;
        return {
          name: pos.name || pos.code,
          code: pos.code,
          value: margin,
          float_pnl: pos.float_pnl,
          volume: pos.volume,
          dir: pos.direction,
          profit_rate: margin > 0 ? (pos.float_pnl / margin * 100) : 0,
          itemStyle: {
            color: getProfitRateColor(pos.float_pnl, margin)
          }
        };
      })
    }));

    const max = Math.max(...positions.map(pos => pos.margin || 0));
    return { data, max };
  }, [positions]);

  // 颜色指示器组件
  const renderColorLegend = () => {
    const legendItems = [
      { label: '-50%+', color: '#00FF00' },    // 鲜亮纯绿（严重亏损）
      { label: '-20%', color: '#00CC00' },     // 亮绿
      { label: '-10%', color: '#228B22' },     // 森林绿
      { label: '-5%', color: '#006400' },      // 暗绿
      { label: '~0%', color: '#003300' },      // 深暗绿（接近0%）
      { label: '0%', color: '#2a2a2a' },       // 深暗灰色（绝对0%）
      { label: '~0%', color: '#8D1E1E' },      // 深暗红（接近0%）
      { label: '+5%', color: '#C62828' },      // 中暗红
      { label: '+10%', color: '#E53935' },     // 中红
      { label: '+20%', color: '#FF3030' },     // 更亮红
      { label: '+50%+', color: '#FF0000' }     // 鲜亮纯红（高盈利）
    ];

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '10px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <span style={{ fontSize: '12px', marginRight: '8px', color: '#666' }}>盈利率:</span>
        {legendItems.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: '6px'
          }}>
            <div style={{
              width: '16px',
              height: '12px',
              backgroundColor: item.color,
              marginRight: '2px',
              border: '1px solid #ccc'
            }} />
            <span style={{ fontSize: '10px', color: '#666' }}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderHeatmap = () => {
    if (!positions.length) {
      return (
        <div style={{ textAlign: 'center', padding: '100px', color: '#999' }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>暂无持仓数据</p>
          <p>请选择有持仓的账户查看热力图</p>
        </div>
      );
    }

    const option = {
      backgroundColor: '#2a2a2a',  // 深灰色背景，用于分离板块
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (data.children) {
            // 行业级别的tooltip
            const totalMargin = data.children.reduce((sum: number, child: any) => sum + child.value, 0);
            const totalPnl = data.children.reduce((sum: number, child: any) => sum + child.float_pnl, 0);
            return `
              <div style="line-height: 1.8;">
                <strong>${data.name}</strong><br/>
                总保证金: ¥${totalMargin.toLocaleString()}<br/>
                总浮动盈亏: ¥${totalPnl.toLocaleString()}<br/>
                持仓品种: ${data.children.length}个
              </div>
            `;
          } else {
            // 具体品种的tooltip
            const dirText = data.dir; // 现在直接显示 "多" 或 "空"
            const profitRateText = data.profit_rate ? data.profit_rate.toFixed(2) + '%' : '0.00%';
            return `
              <div style="line-height: 1.8;">
                <strong>${data.name}</strong> (${data.code})<br/>
                方向: ${dirText}<br/>
                手数: ${data.volume}<br/>
                保证金: ¥${Number(data.value).toLocaleString()}<br/>
                浮动盈亏: ¥${Number(data.float_pnl).toLocaleString()}<br/>
                盈利率: ${profitRateText}
              </div>
            `;
          }
        }
      },
      series: [
        {
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          data: processedHeatmapData.data,
          breadcrumb: {
            show: false  // 关闭面包屑导航，这是黑色标题栏
          },
          label: {
            show: true,
            formatter: (params: any) => {
              if (params.data.children) {
                // 行业级别只显示名称
                return params.data.name;
              } else {
                // 品种级别显示名称和盈利率
                const profitRate = params.data.profit_rate || 0;
                return `${params.data.name}\n${profitRate.toFixed(1)}%`;
              }
            },
            color: '#fff',  // 使用白色字体
            fontSize: 14,   // 放大字号
            fontWeight: 'normal'  // 去掉加粗
          },
          levels: [
            {
              // 第一级：行业级别 - 标题条样式
              itemStyle: {
                borderColor: '#000000',  // 黑色边框作为分隔
                borderWidth: 2,
                gapWidth: 8  // 板块间适中间隔
              },
              label: {
                show: true,
                position: 'top',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 'bold',
                padding: [8, 15],
                borderRadius: 0,
                width: '100%',
                height: 25,
                align: 'center',
                verticalAlign: 'middle'
              }
            },
            {
              // 第二级：品种级别 - 更紧密的间隙
              itemStyle: {
                borderColor: '#333',  // 品种之间使用深色边框
                borderWidth: 1,
                gapWidth: 1  // 品种间更紧密
              },
              label: {
                show: true,
                color: '#fff',      // 使用白色字体
                fontSize: 13,       // 字号
                fontWeight: 'normal'  // 去掉加粗
              }
            }
          ]
        }
      ]
    };

    return (
      <div>
        {renderColorLegend()}
        <ReactECharts
          option={option}
          style={{ height: 'calc(100vh - 250px)', minHeight: '450px', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </div>
    );
  };

  const renderTable = () => {
    return (
      <Table
        columns={getColumns()}
        dataSource={positions}
        rowKey={(record) => `${record.accountid || 'single'}_${record.code}_${record.direction}_${record.exchange}`}
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="small"
        className="dense-table"
      />
    );
  };

  // 数据处理逻辑：按品种聚合持仓数据
  const processedChartData = useMemo(() => {
    if (!positions || positions.length === 0) {
      return { marginTop10: [], profitTop10: [], lossTop10: [] };
    }

    // 按品种聚合数据
    const symbolMap = new Map<string, { margin: number; float_pnl: number; code: string }>();

    positions.forEach(pos => {
      // 提取品种代码（去除数字部分，如 AP410 -> AP）
      const symbol = pos.code.replace(/[0-9]/g, '');
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, {
          margin: 0,
          float_pnl: 0,
          code: symbol
        });
      }
      const data = symbolMap.get(symbol)!;
      data.margin += pos.margin;
      data.float_pnl += pos.float_pnl;
    });

    const symbolData = Array.from(symbolMap.values());

    // 按保证金排序取前10
    const marginTop10 = symbolData
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10)
      .map(item => ({
        name: item.code,
        value: Math.round(item.margin)
      }));

    // 按浮动盈亏（正）排序取前10
    const profitTop10 = symbolData
      .filter(item => item.float_pnl > 0)
      .sort((a, b) => b.float_pnl - a.float_pnl)
      .slice(0, 10)
      .map(item => ({
        name: item.code,
        value: Math.round(item.float_pnl)
      }));

    // 按浮动盈亏（负）排序取前10
    const lossTop10 = symbolData
      .filter(item => item.float_pnl < 0)
      .sort((a, b) => a.float_pnl - b.float_pnl)
      .slice(0, 10)
      .map(item => ({
        name: item.code,
        value: Math.round(Math.abs(item.float_pnl))
      }));

    return { marginTop10, profitTop10, lossTop10 };
  }, [positions]);

  // 饼图配置生成函数 - 现代化设计风格
  const getPieOption = (title: string, data: any[], colors: string[]) => ({
    title: {
      text: title,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'transparent',
      textStyle: {
        color: '#fff',
        fontSize: 14
      },
      borderRadius: 8,
      extraCssText: 'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);'
    },
    legend: {
      orient: 'horizontal',
      left: 'center',
      top: 60,
      textStyle: {
        fontSize: 12,
        color: '#5a6c7d'
      },
      itemGap: 16,
      itemWidth: 12,
      itemHeight: 12,
      formatter: (name: string) => name.toUpperCase() // 品种名大写
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '55%'],  // 向上调整饼图位置
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 0,
        borderColor: '#ffffff',
        borderWidth: 3,
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.1)'
      },
      label: {
        show: true,
        position: 'outside',
        fontSize: 12,
        fontWeight: '500',
        color: '#2c3e50',
        formatter: (params: any) => params.name.toUpperCase()
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10,
        smooth: true,
        lineStyle: {
          color: '#bdc3c7',
          width: 2
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        },
        label: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      data: data
    }],
    color: colors
  });

  const renderCharts = () => {
    const { marginTop10, profitTop10, lossTop10 } = processedChartData;

    // 色阶设计 - 数据从大到小排序，所以颜色从深到浅（最大值用最深色，但降低最深档位的色深）
    const blueColors = ['#1f4e66', '#2d5a7b', '#3a6b91', '#4d7ba8', '#5b8bc4', '#6999d6', '#7ba8e3', '#8fb7f0', '#a3c6fd', '#b8d5ff'];  // 保证金：深蓝到浅蓝
    const redColors = ['#5c1a1a', '#7a2222', '#982a2a', '#b63333', '#d63c3c', '#e55555', '#f06e6e', '#fa8787', '#ffa0a0', '#ffb9b9'];    // 盈利：深红到浅红
    const greenColors = ['#1a5c1a', '#227a22', '#2a982a', '#33b633', '#3cd63c', '#55e555', '#6ef06e', '#87fa87', '#a0ffa0', '#b9ffb9']; // 亏损：深绿到浅绿

    if (positions.length === 0) {
      return (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="图表视图">
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p>暂无持仓数据</p>
                <p>请选择有持仓的账户查看图表</p>
              </div>
            </Card>
          </Col>
        </Row>
      );
    }

    return (
      <div style={{ paddingTop: '12px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
          <Card>
            {marginTop10.length > 0 ? (
              <ReactECharts
                option={getPieOption('保证金TOP10', marginTop10, blueColors)}
                style={{ height: '500px' }}
                opts={{ renderer: 'svg' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p>暂无保证金数据</p>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            {profitTop10.length > 0 ? (
              <ReactECharts
                option={getPieOption('浮动盈利TOP10', profitTop10, redColors)}
                style={{ height: '500px' }}
                opts={{ renderer: 'svg' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p>暂无盈利数据</p>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            {lossTop10.length > 0 ? (
              <ReactECharts
                option={getPieOption('浮动亏损TOP10', lossTop10, greenColors)}
                style={{ height: '500px' }}
                opts={{ renderer: 'svg' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p>暂无亏损数据</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      </div>
    );
  };

  return (
    <div className="positions">
      <div className="positions-toolbar">
        <span className="toolbar-label">视图模式</span>
        <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <Radio.Button value="table">表格视图</Radio.Button>
          <Radio.Button value="heatmap">热力图</Radio.Button>
          <Radio.Button value="chart">图表视图</Radio.Button>
        </Radio.Group>
      </div>

      <div className="positions-body">
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
              className="positions-content"
              title={`持仓数据 (${selectedAccounts.length}个账户, ${positions.length}条记录)`}
            >
              <Spin spinning={loading}>
                {viewMode === 'heatmap' ? renderHeatmap() : viewMode === 'table' ? renderTable() : renderCharts()}
              </Spin>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Positions;
