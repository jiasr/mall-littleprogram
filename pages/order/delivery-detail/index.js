import { fetchOrderTrack } from '../../../services/order/orderTrack';

Page({
  data: {
    logisticsData: {
      logisticsNo: '',
      nodes: [],
      company: '',
      phoneNumber: '',
    },
    active: 0,
    orderNo: '', // 有订单号时表示可实时刷新轨迹
    loading: false,
    errorMsg: '',
  },

  onLoad(query) {
    let data;
    try {
      data = JSON.parse(decodeURIComponent(query.data || '{}'));
    } catch (e) {
      console.warn('物流节点数据解析失败', e);
    }
    // 售后来源(source=2)：沿用服务端带回的快照数据
    if (Number(query.source) === 2) {
      this.setData({
        logisticsData: {
          company: data.logisticsCompanyName,
          logisticsNo: data.logisticsNo,
          nodes: data.nodes || [],
        },
      });
      return;
    }
    // 传了订单号：实时向后端拉轨迹
    if (query.orderNo) {
      this.setData({
        orderNo: query.orderNo,
        logisticsData: {
          logisticsNo: query.logisticsNo || (data && data.logisticsNo) || '',
          company: query.company || (data && data.company) || '',
          phoneNumber: (data && data.phoneNumber) || '',
          nodes: (data && data.nodes) || [],
        },
      });
      this.loadTrack();
      return;
    }
    // 兼容：仅传快照数据
    if (data) {
      this.setData({ logisticsData: data });
    }
  },

  // 实时拉取物流轨迹
  async loadTrack() {
    const { orderNo } = this.data;
    if (!orderNo) return;
    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await fetchOrderTrack(orderNo);
      const list = (res && res.list) || [];
      const nodes = list.map((item) => ({
        title: item.status || '物流更新',
        desc: item.location || '',
        date: item.time || '',
        icon: '',
      }));
      this.setData({
        'logisticsData.logisticsNo': res.waybillNo || this.data.logisticsData.logisticsNo,
        'logisticsData.company': res.company || this.data.logisticsData.company,
        'logisticsData.nodes': nodes,
      });
      if (!res.success && res.message) {
        this.setData({ errorMsg: res.message });
      } else if (!nodes.length) {
        this.setData({ errorMsg: '暂无物流轨迹' });
      }
    } catch (e) {
      console.error('查询物流轨迹失败', e);
      this.setData({ errorMsg: '物流轨迹查询失败，请下拉重试' });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 下拉刷新轨迹
  onPullDownRefresh() {
    if (this.data.orderNo) {
      this.loadTrack();
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onLogisticsNoCopy() {
    wx.setClipboardData({ data: this.data.logisticsData.logisticsNo });
  },

  onCall() {
    const { phoneNumber } = this.data.logisticsData;
    wx.makePhoneCall({
      phoneNumber,
    });
  },
});
