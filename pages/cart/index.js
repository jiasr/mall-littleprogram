import Dialog from 'tdesign-miniprogram/dialog/index';
import Toast from 'tdesign-miniprogram/toast/index';
import { fetchCartList, updateCart, deleteCart, clearCart } from '../../services/cart/cart';

Page({
  data: {
    cartGroupData: { storeGoods: [], invalidGoodItems: [], isNotEmpty: false, totalAmount: 0 },
  },

  onShow() {
    this.getTabBar().init();
    this.refreshData();
  },

  onLoad() {
    this.refreshData();
  },

  async refreshData() {
    try {
      const data = await fetchCartList();
      if (!data) return;

      const validItems = data.validItems || [];
      const invalidItems = data.invalidItems || [];

      // 适配现有 UI 组件的数据格式
      const cartGroupData = {
        storeGoods: [{
          storeId: '1000',
          storeName: '',
          isSelected: validItems.every(g => g.isSelected),
          storeStockShortage: false,
          promotionGoodsList: [{
            goodsPromotionList: validItems.map(g => ({
              spuId: g.spuId,
              skuId: g.skuId,
              title: g.title,
              thumb: g.thumb,
              price: g.price,
              quantity: g.quantity,
              stockQuantity: g.stock,
              isSelected: g.isSelected,
              specInfo: g.specInfo || [],
            })),
            shortageGoodsList: [],
          }],
        }],
        invalidGoodItems: invalidItems.map(g => ({
          spuId: g.spuId,
          skuId: g.skuId,
          title: g.title,
          thumb: g.thumb,
          price: g.price,
          invalidReason: g.invalidReason || '已失效',
        })),
        isNotEmpty: validItems.length > 0 || invalidItems.length > 0,
        isAllSelected: validItems.length > 0 && validItems.every(g => g.isSelected),
        totalAmount: data.selectedPrice || 0,
        selectedGoodsCount: data.selectedCount || 0,
      };

      this.setData({ cartGroupData });
      this.updateBadge(data);
    } catch (err) {
      console.error('加载购物车失败', err);
    }
  },

  updateBadge(data) {
    var app = getApp();
    var count = 0;
    if (data && data.validItems) {
      for (var i = 0; i < data.validItems.length; i++) {
        count += data.validItems[i].quantity || 0;
      }
    }
    app.globalData.cartCount = count;
    if (app.updateCartBadge) app.updateCartBadge();
  },

  // 选择单个商品
  async selectGoodsService({ spuId, skuId, isSelected }) {
    const item = this.findGoods(spuId, skuId);
    if (!item) return;
    try {
      await updateCart(item.cartId, { isSelected });
    } catch (e) {
      console.error('更新选中状态失败', e);
    }
  },

  // 全选门店
  async selectStoreService({ storeId, isSelected }) {
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    try {
      for (const g of items) {
        await updateCart(g.cartId, { isSelected });
      }
    } catch (e) {
      console.error('全选失败', e);
    }
  },

  // 加购数量变更
  async changeQuantityService({ spuId, skuId, quantity }) {
    const item = this.findGoods(spuId, skuId);
    if (!item) return;
    try {
      await updateCart(item.cartId, { quantity });
    } catch (e) {
      console.error('更新数量失败', e);
    }
  },

  // 删除加购商品
  async deleteGoodsService({ spuId, skuId }) {
    const item = this.findGoods(spuId, skuId);
    if (!item) return;
    try {
      await deleteCart(item.cartId);
    } catch (e) {
      console.error('删除失败', e);
    }
  },

  // 清空失效商品
  async clearInvalidGoodsService() {
    try {
      const invalid = this.data.cartGroupData?.invalidGoodItems || [];
      if (invalid.length > 0) {
        await deleteCart(invalid.map(g => g.cartId));
      }
    } catch (e) {
      console.error('清空失效失败', e);
    }
  },

  findGoods(spuId, skuId) {
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    return items.find(g => g.spuId === spuId && g.skuId === skuId);
  },

  // ====== 事件处理 ======

  onGoodsSelect(e) {
    const { goods: { spuId, skuId }, isSelected } = e.detail;
    this.selectGoodsService({ spuId, skuId, isSelected }).then(() => this.refreshData());
  },

  onStoreSelect(e) {
    const { store: { storeId }, isSelected } = e.detail;
    this.selectStoreService({ storeId, isSelected }).then(() => this.refreshData());
  },

  onQuantityChange(e) {
    // 防抖 300ms
    if (!this._qtyTimers) this._qtyTimers = {};
    var key = e.detail.goods.spuId + '_' + e.detail.goods.skuId;
    clearTimeout(this._qtyTimers[key]);
    var that = this;
    this._qtyTimers[key] = setTimeout(function() {
      var goods = e.detail.goods;
      that.changeQuantityService({ spuId: goods.spuId, skuId: goods.skuId, quantity: e.detail.quantity })
        .then(function() { that.refreshData(); });
    }, 300);
  },

  onGoodsDelete(e) {
    const { goods: { spuId, skuId } } = e.detail;
    Dialog.confirm({ content: '确认删除该商品吗?', confirmBtn: '确定' })
      .then(() => this.deleteGoodsService({ spuId, skuId }))
      .then(() => { Toast({ context: this, selector: '#t-toast', message: '删除成功' }); this.refreshData(); });
  },

  clearInvalidGoods() {
    this.clearInvalidGoodsService().then(() => this.refreshData());
  },

  goGoodsDetail(e) {
    const { spuId } = e.detail.goods;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
  },

  onSelectAll(event) {
    const { isAllSelected } = event?.detail ?? {};
    const storeId = '1000';
    this.selectStoreService({ storeId, isSelected: !isAllSelected }).then(() => this.refreshData());
  },

  onToSettle() {
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    const selected = items.filter(g => g.isSelected);
    if (selected.length === 0) {
      Toast({ context: this, selector: '#t-toast', message: '请选择商品' });
      return;
    }
    wx.setStorageSync('order.goodsRequestList', JSON.stringify(selected));
    wx.navigateTo({ url: '/pages/order/order-confirm/index?type=cart' });
  },

  onGotoHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },
});
