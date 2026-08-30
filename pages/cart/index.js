import Dialog from 'tdesign-miniprogram/dialog/index';
import Toast from 'tdesign-miniprogram/toast/index';
import { fetchCartList, updateCart, deleteCart } from '../../services/cart/cart';
import * as cartStore from '../../services/cart/cartStore';
import { ensurePhoneLogin, isPhoneBound, goLogin } from '../../utils/auth';

// 商品无图时的默认占位图
const DEFAULT_THUMB =
  'https://dummyimage.com/192x192/eeeeee/999999&text=%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87';

Page({
  data: {
    cartGroupData: { storeGoods: [], invalidGoodItems: [], isNotEmpty: false, totalAmount: 0 },
    showLoginDialog: false,
  },

  async onShow() {
    this.getTabBar().init();
    this.checkLogin();
    const app = getApp();
    cartStore.init(app.globalData.userid || '');
    if (cartStore.hasPending()) {
      // 本地仍有未同步的变更（含上次进程被杀遗留）：先补提交再拉服务端，避免回退
      await cartStore.flush();
    }
    this.refreshData();
  },

  onLoad() {
    const app = getApp();
    cartStore.init(app.globalData.userid || '');
    // 快照秒开：先用本地缓存渲染，再拉服务端最新替换
    const snapshot = cartStore.getSnapshot();
    if (snapshot && snapshot.validItems && snapshot.validItems.length > 0) {
      this._renderCart(snapshot);
    }
    this.refreshData();
  },

  // 页面隐藏/切走 tab 时，尽力把本地未同步的变更刷到后端
  onHide() {
    cartStore.flush();
  },

  onUnload() {
    cartStore.flush();
  },

  // 未绑定手机号则弹"前往登录"全覆盖弹窗（统一走 isPhoneBound 判断）
  async checkLogin() {
    const hasPhone = await isPhoneBound();
    // 缓存手机号，供本页使用
    this.hasBoundPhone = hasPhone;
    if (!hasPhone && !this._loginDialogShown) {
      this._loginDialogShown = true;
      this.setData({ showLoginDialog: true });
    }
  },

  onCancelLogin() {
    this.setData({ showLoginDialog: false });
  },

  onGoLogin() {
    this.setData({ showLoginDialog: false });
    goLogin('cart');
  },

  // 后端会话失效/未登录：弹提示，确认后才跳转登录页（防止重复提示，跳转统一走 goLogin）
  redirectToLogin() {
    if (this._loginRedirecting) return;
    this._loginRedirecting = true;
    wx.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        this._loginRedirecting = false;
        if (res.confirm) goLogin('cart');
      },
    });
  },

  async refreshData() {
    // 统一登录校验：手机号未绑定不渲染购物车（引导由 checkLogin 的全覆盖弹窗承担，避免重复弹）
    const logged = await ensurePhoneLogin({ from: 'cart', prompt: false });
    if (!logged) return;
    try {
      const data = await fetchCartList();
      // 接口返回未登录/失败：引导登录
      if (!data || data.success === false) {
        this.redirectToLogin();
        return;
      }

      // 缓存服务端快照 + 版本号（Layer 1 持久化）
      cartStore.setSnapshot(data, data.version);
      this._renderCart(data);
      this.updateBadge(data);
    } catch (err) {
      console.error('加载购物车失败', err);
    }
  },

  // 渲染购物车（服务端数据或本地快照）
  _renderCart(data) {
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
            cartId: g.cartId,
            spuId: g.spuId,
            skuId: g.skuId,
            title: g.title,
            thumb: g.thumb || DEFAULT_THUMB,
            price: g.price,
            quantity: g.quantity,
            stockQuantity: g.stock,
            isSelected: g.isSelected,
            specInfo: g.specInfo || [],
            skuList: g.skuList || [],
          })),
          shortageGoodsList: [],
        }],
      }],
      invalidGoodItems: invalidItems.map(g => ({
        cartId: g.cartId,
        spuId: g.spuId,
        skuId: g.skuId,
        title: g.title,
        thumb: g.thumb || DEFAULT_THUMB,
        price: g.price,
        specInfo: g.specInfo || [],
        invalidReason: g.invalidReason || '已失效',
      })),
      isNotEmpty: validItems.length > 0 || invalidItems.length > 0,
      isAllSelected: validItems.length > 0 && validItems.every(g => g.isSelected),
      totalAmount: data.selectedPrice || 0,
      selectedGoodsCount: data.selectedCount || 0,
    };

    this.setData({ cartGroupData });
  },

  updateBadge(data) {
    var app = getApp();
    var count = 0;
    if (data && data.validItems) {
      for (var i = 0; i < data.validItems.length; i++) {
        count += data.validItems[i].quantity || 0;
      }
    }
    // 以购物车列表真实件数为准校准全局数量
    if (app.setCartCount) {
      app.setCartCount(count);
    } else {
      app.globalData.cartCount = count;
      if (app.updateCartBadge) app.updateCartBadge();
    }
  },

  // ====== 本地先行 + 防抖批量同步 ======

  _goodsPath() {
    return 'cartGroupData.storeGoods[0].promotionGoodsList[0].goodsPromotionList';
  },

  // 修改本地购物车数据（UI 立即变化）并入变更队列，不立即请求后端
  applyLocalChange({ spuId, skuId, cartId, quantity, isSelected }) {
    const path = this._goodsPath();
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    const item = items.find(g => g.spuId === spuId && g.skuId === skuId);
    if (!item) return;
    if (quantity != null) {
      // 本地数量安全钳制：非法/越界值统一收敛
      let q = parseInt(quantity, 10);
      if (isNaN(q) || q < 1) q = 1;
      if (q > 999) q = 999;
      if (item.stockQuantity && q > item.stockQuantity) q = item.stockQuantity;
      item.quantity = q;
      quantity = q;
    }
    if (isSelected != null) item.isSelected = isSelected;
    this.setData({ [path]: items });
    cartStore.enqueue({ cartId: cartId || item.cartId, spuId, skuId, quantity, isSelected });
    this.recalcCartBar();
    this.updateLocalBadge();
  },

  // 本地删除商品（UI 立即移除）并入删除队列
  removeLocalGoods(goods) {
    const path = this._goodsPath();
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    const idx = items.findIndex(g => g.spuId === goods.spuId && g.skuId === goods.skuId);
    if (idx < 0) return;
    items.splice(idx, 1);
    const invalid = this.data.cartGroupData?.invalidGoodItems || [];
    this.setData({
      [path]: items,
      'cartGroupData.isNotEmpty': items.length > 0 || invalid.length > 0,
    });
    cartStore.enqueue({ cartId: goods.cartId, spuId: goods.spuId, skuId: goods.skuId, deleted: true });
    this.recalcCartBar();
    this.updateLocalBadge();
  },

  // 全选/取消全选：本地先行 + 批量入队
  selectStoreLocal({ isSelected }) {
    const path = this._goodsPath();
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    items.forEach(g => { g.isSelected = isSelected; });
    this.setData({
      [path]: items,
      'cartGroupData.storeGoods[0].isSelected': isSelected,
    });
    items.forEach(g => cartStore.enqueue({ cartId: g.cartId, spuId: g.spuId, skuId: g.skuId, isSelected }));
    this.recalcCartBar();
  },

  // 本地重算底部结算栏（金额/件数/全选状态）
  recalcCartBar() {
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    let totalAmount = 0;
    let selectedCount = 0;
    let allSelected = items.length > 0;
    items.forEach(g => {
      if (g.isSelected) {
        totalAmount += (g.price || 0) * (g.quantity || 0);
        selectedCount += g.quantity || 0;
      } else {
        allSelected = false;
      }
    });
    this.setData({
      'cartGroupData.totalAmount': totalAmount,
      'cartGroupData.selectedGoodsCount': selectedCount,
      'cartGroupData.isAllSelected': allSelected,
      'cartGroupData.storeGoods[0].isSelected': allSelected,
    });
  },

  // 本地徽标实时更新
  updateLocalBadge() {
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    const count = items.reduce((s, g) => s + (g.quantity || 0), 0);
    const app = getApp();
    if (app.setCartCount) app.setCartCount(count);
  },

  // ====== 事件处理 ======

  onGoodsSelect(e) {
    const { goods: { spuId, skuId, cartId }, isSelected } = e.detail;
    this.applyLocalChange({ spuId, skuId, cartId, isSelected });
  },

  onStoreSelect(e) {
    const { isSelected } = e.detail;
    this.selectStoreLocal({ isSelected });
  },

  onQuantityChange(e) {
    const { goods: { spuId, skuId, cartId }, quantity } = e.detail;
    this.applyLocalChange({ spuId, skuId, cartId, quantity });
  },

  onGoodsDelete(e) {
    const { goods } = e.detail;
    Dialog.confirm({ content: '确认删除该商品吗?', confirmBtn: '确定' })
      .then(() => {
        this.removeLocalGoods(goods);
        Toast({ context: this, selector: '#t-toast', message: '删除成功' });
      });
  },

  // 购物车规格切换：调后端换 SKU，成功刷新列表
  async onCartSkuChange(e) {
    const { cartId, oldSkuId, newSkuId } = (e && e.detail) || {};
    if (!cartId || !newSkuId || newSkuId === oldSkuId) return;
    try {
      await updateCart(cartId, { skuId: newSkuId });
      Toast({ context: this, selector: '#t-toast', message: '规格已切换' });
      this.refreshData();
    } catch (err) {
      Toast({ context: this, selector: '#t-toast', message: '切换失败，请重试' });
    }
  },

  clearInvalidGoods() {
    this.clearInvalidGoodsService().then(() => this.refreshData());
  },

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

  goGoodsDetail(e) {
    const { spuId } = e.detail.goods;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
  },

  onSelectAll(event) {
    const { isAllSelected } = event?.detail ?? {};
    this.selectStoreLocal({ isSelected: !isAllSelected });
  },

  async onToSettle() {
    const items = this.data.cartGroupData?.storeGoods[0]?.promotionGoodsList[0]?.goodsPromotionList || [];
    const selected = items.filter(g => g.isSelected);
    if (selected.length === 0) {
      Toast({ context: this, selector: '#t-toast', message: '请选择商品' });
      return;
    }
    // 结算前强制把本地未同步的变更刷到后端，避免拿本地旧数据下单（最重要兜底）
    const result = await cartStore.flush();
    if (result && result.conflict) {
      Toast({ context: this, selector: '#t-toast', message: '购物车已在其他设备修改，已为你刷新，请重新确认' });
      this.refreshData();
      return;
    }
    wx.setStorageSync('order.goodsRequestList', JSON.stringify(selected));
    wx.navigateTo({ url: '/pages/order/order-confirm/index?type=cart' });
  },

  onGotoHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },
});
