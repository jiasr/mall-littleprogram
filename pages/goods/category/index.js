import { get } from '../../../utils/request';

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
    // 规格弹窗（公共组件）
    specPopupPrice: '',
    goodsItemPrice: '',
  },

  onShow() {
    this.getTabBar().init();
    // 每次显示时检查是否有导航目标分类（switchTab 不支持参数，用 Storage 传参）
    const navCategoryId = wx.getStorageSync('navCategoryId');
    if (navCategoryId) {
      wx.removeStorageSync('navCategoryId');
      this._navCategoryId = navCategoryId;
      this.loadCategory(true);
    } else {
      // 已加载过且非导航进入则不再重复请求分类树
      if (!this.data.topList.length) {
        this.loadCategory();
      }
    }
  },

  onLoad() {
    // 分类树由 onShow 统一加载，避免与 onShow 重复请求
  },

  async loadCategory(hasTarget) {
    try {
      const res = await get('/v1/goodscatalog/tree');
      const topList = res || [];
      this.setData({ topList });

      // 如果有导航目标分类 ID，找到它在 topList 中的索引
      const targetId = this._navCategoryId;
      if (targetId) {
        const index = topList.findIndex(item => item.id === targetId);
        if (index >= 0) {
          this.switchTop(index);
          this._navCategoryId = null;
          return;
        }
      }
      // 没有目标时，仅在首次或明确需要刷新时才重置到第一个
      if (hasTarget || this.data.goodsList.length === 0) {
        this.switchTop(0);
      }
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

  // ====== 上拉加载更多（节流） ======
  onLoadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    const now = Date.now();
    if (this._lastLoadMore && now - this._lastLoadMore < 300) return;
    this._lastLoadMore = now;
    const { pageNum, activeSub, subList } = this.data;
    this.setData({ pageNum: pageNum + 1 });
    this.loadGoods(subList[activeSub]);
  },

  // ====== 商品点击 ======
  onGoodsTap(e) {
    const spuId = e.currentTarget.dataset.spuid;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
  },

  // ====== 选规格（弹窗，公共组件） ======
  onSelectSpec(e) {
    const spuId = e.currentTarget.dataset.spuid;
    const item = this.data.goodsList.find(g => g.spuId === spuId);
    if (!item || !item.skuList) return;
    this.setData({ goodsItemPrice: item.price || '' });
    const popup = this.selectComponent('#specsPopup');
    if (popup && popup.open) {
      popup.open(item);
    }
  },

  // 加购按钮（单规格商品，快捷加购不弹窗）
  onAddCart(e) {
    const spuId = e.currentTarget.dataset.spuid;
    const item = this.data.goodsList.find(g => g.spuId === spuId);
    const skuList = item?.skuList || [];
    if (skuList.length === 0) return;
    const popup = this.selectComponent('#specsPopup');
    if (popup && popup.quickAdd) {
      popup.quickAdd(item);
    }
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

  // ====== 弹窗 ======
  openPopup() {
    this.setData({ popupVisible: true });
  },

  closePopup() {
    this.setData({ popupVisible: false });
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
