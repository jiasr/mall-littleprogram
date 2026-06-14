import { get, post } from '../../../utils/request';

Page({
  data: {
    topList: [],
    subList: [],
    chipList: [],      // 三级分类 chips
    goodsList: [],
    activeTop: 0,
    activeSub: 0,
    loading: false,
    hasMore: false,
    pageNum: 1,
    pageSize: 20,
    popupVisible: false,
    scrollToId: '',
    // 筛选排序
    sortType: 0,
    sortOrder: 'desc',
    activeChip: 0,
    // 规格弹窗
    specPopupShow: false,
    specData: { title: '', thumb: '', specList: [], skuList: [] },
  },

  onShow() {
    this.getTabBar().init();
    this.loadCategory();
  },

  onLoad() {
    this.loadCategory();
  },

  async loadCategory() {
    try {
      const res = await get('/v1/goodscatalog/tree');
      const topList = res || [];
      this.setData({ topList });
      this.switchTop(0);
    } catch (err) {
      console.error('加载分类失败', err);
    }
  },

  switchTop(index) {
    const topList = this.data.topList;
    const subList = (topList[index] && topList[index].children) || [];
    const chipList = this.buildChips(subList[0]);
    this.setData({
      activeTop: index,
      activeSub: 0,
      subList,
      chipList,
      activeChip: 0,
      pageNum: 1,
      goodsList: [],
      scrollToId: 'top-' + index,
    });
    this.loadGoods(subList[0]);
  },

  switchSub(index) {
    const subList = this.data.subList;
    const chipList = this.buildChips(subList[index]);
    this.setData({ activeSub: index, activeChip: 0, chipList, pageNum: 1, goodsList: [] });
    this.loadGoods(subList[index]);
  },

  /** 根据二级分类构建三级chips: [{ id, name }] */
  buildChips(subItem) {
    const chips = [];
    if (subItem && subItem.children && subItem.children.length > 0) {
      chips.push(...subItem.children);
    }
    return chips;
  },

  async loadGoods(subItem) {
    if (!subItem) {
      this.setData({ loading: false, hasMore: false });
      return;
    }
    const { pageNum, pageSize, goodsList, sortType, sortOrder, activeChip, chipList } = this.data;

    // 选中三级分类用 chip id，否则用二级分类 id
    let categoryId = subItem.id;
    if (activeChip > 0 && chipList[activeChip - 1]) {
      categoryId = chipList[activeChip - 1].id;
    }

    this.setData({ loading: true });
    try {
      const sortTypeMap = { 0: '0', 1: null, 2: '1' };
      const res = await get('/v1/goods/list', {
        pageNum,
        pageSize,
        categoryId,
        sort: sortType,
        sortType: sortType === 2 ? sortOrder : (sortTypeMap[sortType] || '0'),
      });
      const newList = (res.spuList || []).map(item => ({
        ...item,
        price: item.price != null ? ((item.price / 100).toFixed(2)) : '0.00',
      }));
      this.setData({
        goodsList: pageNum === 1 ? newList : [...goodsList, ...newList],
        hasMore: newList.length >= pageSize,
        loading: false,
      });
    } catch {
      this.setData({ loading: false });
    }
  },

  // ====== 排序点击 ======
  onSortTap(e) {
    const type = parseInt(e.currentTarget.dataset.sort);
    const { sortType, sortOrder, subList, activeSub } = this.data;
    if (type === 2) {
      const newOrder = sortType === 2 && sortOrder === 'desc' ? 'asc' : 'desc';
      this.setData({ sortType: 2, sortOrder: newOrder, pageNum: 1, goodsList: [] });
    } else if (sortType !== type) {
      this.setData({ sortType: type, sortOrder: 'desc', pageNum: 1, goodsList: [] });
    }
    this.loadGoods(subList[activeSub]);
  },

  // ====== 筛选 chip 点击 ======
  onChipTap(e) {
    const chip = parseInt(e.currentTarget.dataset.chip);
    if (chip === this.data.activeChip) return;
    this.setData({ activeChip: chip, pageNum: 1, goodsList: [] });
    const subList = this.data.subList;
    this.loadGoods(subList[this.data.activeSub]);
  },

  // ====== 顶部一级点击 ======
  onTopTap(e) {
    const i = e.currentTarget.dataset.index;
    if (i === this.data.activeTop) return;
    this.switchTop(i);
  },

  // ====== 左侧二级点击 ======
  onSubTap(e) {
    const i = e.currentTarget.dataset.index;
    if (i === this.data.activeSub) return;
    this.switchSub(i);
  },

  // ====== 上拉加载更多 ======
  onLoadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    const { pageNum, activeSub, subList } = this.data;
    this.setData({ pageNum: pageNum + 1 });
    this.loadGoods(subList[activeSub]);
  },

  // ====== 商品点击 ======
  onGoodsTap(e) {
    const spuId = e.currentTarget.dataset.spuid;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
  },

  // ====== 选规格（弹窗） ======
  onSelectSpec(e) {
    const spuId = e.currentTarget.dataset.spuid;
    const item = this.data.goodsList.find(g => g.spuId === spuId);
    if (!item || !item.skuList) return;
    this._currentSpuId = spuId;
    // 构建 specList（从 skuList 提取唯一规格）
    const specMap = {};
    item.skuList.forEach(sku => {
      (sku.specInfo || []).forEach(si => {
        const key = si.specTitle || si.specId || '';
        if (!specMap[key]) specMap[key] = { title: key, values: [] };
        const v = si.specValues || si.specValue || '';
        if (!specMap[key].values.includes(v)) specMap[key].values.push(v);
      });
    });
    // 构建 specList（需要 specId 用于匹配选择）
    const specList = Object.values(specMap).map(s => ({
      specId: s.title,
      title: s.title,
      specValueList: s.values.map(v => ({
        specValue: v,
        specValueId: s.title + '_' + v,
      })),
    }));
    // 构建 skuList（specId/specValueId 须与 specList 一致）
    const skuList = item.skuList.map(sku => ({
      skuId: sku.skuId,
      quantity: sku.stock || 0,
      specInfo: (sku.specInfo || []).map(si => ({
        specId: si.specTitle || si.specId || '',
        specValueId: (si.specTitle || si.specId || '') + '_' + (si.specValues || si.specValue || ''),
        specValue: si.specValues || si.specValue || '',
      })),
    }));
    // 最低价
    const minPrice = Math.min(...item.skuList.map(s => s.price || Infinity));
    this.setData({
      specPopupShow: true,
      specData: {
        title: item.title,
        thumb: item.thumb || '',
        specList,
        skuList,
        minPrice: (minPrice / 100) || 0,
        selectedPrice: '',
      },
    });
  },

  onSpecPopupClose() {
    this.setData({ specPopupShow: false });
  },

  onSpecChange(e) {
    const { selectedSku, isAllSelectedSku } = e.detail || {};
    if (isAllSelectedSku && selectedSku) {
      this._selectedSku = selectedSku;
      const match = this.data.specData.skuList.find(sku =>
        (sku.specInfo || []).every(si => selectedSku[si.specId] === si.specValueId)
      );
      if (match) {
        const item = this.data.goodsList.find(g => (g.skuList || []).some(s => s.skuId === match.skuId));
        if (item) {
          const sku = item.skuList.find(s => s.skuId === match.skuId);
          if (sku) {
            this.setData({ 'specData.selectedPrice': (sku.price / 100).toFixed(2) });
          }
        }
      }
    } else {
      this._selectedSku = null;
      this.setData({ 'specData.selectedPrice': '' });
    }
  },

  onSpecConfirm() {
    this.doAddCart();
  },

  onSpecAddCart() {
    this.doAddCart();
  },

  async doAddCart() {
    const spuId = this._currentSpuId;
    const selectedSku = this._selectedSku;
    if (!spuId || !selectedSku) {
      wx.showToast({ title: '请先选择完整规格', icon: 'none' });
      return;
    }
    const match = this.data.specData.skuList.find(sku =>
      (sku.specInfo || []).every(si => selectedSku[si.specId] === si.specValueId)
    );
    if (!match) {
      wx.showToast({ title: '规格匹配失败', icon: 'none' });
      return;
    }
    try {
      const res = await post('/v1/cart/add', { spuId, skuId: match.skuId, quantity: 1 });
      if (res && res.success) {
        wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1500 });
        this.updateCartBadge(res.cartCount);
      } else {
        wx.showToast({ title: res?.message || '加购失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '加购失败', icon: 'none' });
    }
    this.setData({ specPopupShow: false });
  },

  // ====== 加购按钮（单规格） ======
  async onAddCart(e) {
    const spuId = e.currentTarget.dataset.spuid;
    const item = this.data.goodsList.find(g => g.spuId === spuId);
    const skuList = item?.skuList || [];
    if (skuList.length === 0) return;
    const skuId = skuList[0].skuId;
    try {
      const res = await post('/v1/cart/add', { spuId, skuId, quantity: 1 });
      if (res && res.success) {
        wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1500 });
        this.updateCartBadge(res.cartCount);
      } else {
        wx.showToast({ title: res?.message || '加购失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '加购失败', icon: 'none' });
    }
  },

  updateCartBadge(count) {
    var app = getApp();
    app.globalData.cartCount = typeof count === 'number' ? count : (app.globalData.cartCount || 0);
    if (typeof this.getTabBar === 'function') {
      var tabBar = this.getTabBar();
      if (tabBar && tabBar.updateCartBadge) {
        tabBar.updateCartBadge();
      }
    }
  },

  // ====== 弹窗 ======
  openPopup() {
    this.setData({ popupVisible: true });
  },

  onPopupClose(e) {
    this.setData({ popupVisible: e.detail.show });
  },

  onPopupSelect(e) {
    const i = e.currentTarget.dataset.index;
    this.setData({ popupVisible: false });
    if (i === this.data.activeTop) return;
    this.switchTop(i);
  },
});
