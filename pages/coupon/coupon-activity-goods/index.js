import { fetchCouponDetail } from '../../../services/coupon/index';
import { fetchGoodsList } from '../../../services/good/fetchGoods';

Page({
  data: {
    goods: [],
    detail: {},
    couponTypeDesc: '',
    showStoreInfoList: false,
    cartNum: 2,
    // 规格弹窗（公共组件）
    specPopupPrice: '',
    goodsItemPrice: '',
  },

  id: '',

  onLoad(query) {
    const id = parseInt(query.id);
    this.id = id;

    this.getCouponDetail(id);
    this.getGoodsList(id);
  },

  getCouponDetail(id) {
    fetchCouponDetail(id).then(({ detail }) => {
      this.setData({ detail });
      if (detail.type === 2) {
        if (detail.base > 0) {
          this.setData({
            couponTypeDesc: `满${detail.base / 100}元${detail.value}折`,
          });
        } else {
          this.setData({ couponTypeDesc: `${detail.value}折` });
        }
      } else if (detail.type === 1) {
        if (detail.base > 0) {
          this.setData({
            couponTypeDesc: `满${detail.base / 100}元减${detail.value / 100}元`,
          });
        } else {
          this.setData({ couponTypeDesc: `减${detail.value / 100}元` });
        }
      }
    });
  },

  getGoodsList(id) {
    fetchGoodsList(id).then((goods) => {
      this.setData({ goods });
    });
  },

  openStoreList() {
    this.setData({
      showStoreInfoList: true,
    });
  },

  closeStoreList() {
    this.setData({
      showStoreInfoList: false,
    });
  },

  goodClickHandle(e) {
    const { index } = e.detail;
    const { spuId } = this.data.goods[index];
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
  },

  cartClickHandle(e) {
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
});
