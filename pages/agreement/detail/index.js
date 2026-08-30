import { fetchAgreement } from '../../../services/agreement/fetchAgreement';

Page({
  data: {
    loading: true,
    empty: false,
    title: '',
    content: '',
  },

  onLoad(options) {
    const type = options.type || 'agreement';
    // 优先使用登录页预加载的缓存，点击即可直接展示
    const app = getApp();
    const cached = app.globalData.agreements && app.globalData.agreements[type];
    if (cached && cached.content) {
      this.renderData(cached);
      return;
    }
    this.load(type);
  },

  // 渲染协议数据
  renderData(data) {
    this.setData({ loading: false, title: data.title || '', content: data.content });
    if (data.title) {
      wx.setNavigationBarTitle({ title: data.title });
    }
  },

  async load(type) {
    try {
      const data = await fetchAgreement(type);
      if (!data || !data.content) {
        this.setData({ loading: false, empty: true, title: (data && data.title) || '' });
        return;
      }
      // 写回缓存，其他入口再次打开时免请求
      const app = getApp();
      if (!app.globalData.agreements) app.globalData.agreements = {};
      app.globalData.agreements[type] = data;
      this.renderData(data);
    } catch (err) {
      this.setData({ loading: false, empty: true });
    }
  },
});
