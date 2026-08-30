import Toast from 'tdesign-miniprogram/toast/index';
import { fetchPromotion } from '../../services/promotion/detail';

Page({
  data: {
    list: [],
    banner: '',
    time: 0,
    showBannerDesc: false,
    statusTag: '',
    // 规格弹窗（公共组件）
    specPopupPrice: '',
    goodsItemPrice: '',
  },

  onLoad(query) {
    const promotionID = parseInt(query.promotion_id);
    this.getGoodsList(promotionID);
  },

  getGoodsList(promotionID) {
    fetchPromotion(promotionID).then(
      ({ list, banner, time, showBannerDesc, statusTag }) => {
        const goods = list.map((item) => ({
          ...item,
          tags: item.tags.map((v) => v.title),
        }));
        this.setData({
          list: goods,
          banner,
          time,
          showBannerDesc,
          statusTag,
        });
      },
    );
  },

  goodClickHandle(e) {
    const { index } = e.detail;
    const { spuId } = this.data.list[index];
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
  },

  cardClickHandle(e) {
    const { goods } = e.detail;
    if (!goods || goods.spuId == null) return;
    this.setData({ goodsItemPrice: goods.price != null ? (goods.price / 100).toFixed(2) : '' });
    const popup = this.selectComponent('#specsPopup');
    if (popup && popup.open) popup.open(goods);
  },

  onSpecPopupClose() {
    this.setData({ specPopupPrice: '' });
  },

  onSpecChange(e) {
    const { isAllSelectedSku, sku } = e.detail || {};
    if (isAllSelectedSku && sku && sku.price != null) {
      this.setData({ specPopupPrice: (sku.price / 100).toFixed(2) });
    } else {
      this.setData({ specPopupPrice: '' });
    }
  },

  bannerClickHandle() {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '点击规则详情',
    });
  },
});
