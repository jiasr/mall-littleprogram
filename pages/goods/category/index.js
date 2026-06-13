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
    sortType: 0,   // 0-销量 1-折扣 2-价格
    sortOrder: 'desc',
    activeChip: 0,
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
      const newList = (res.spuList || []).map(item => {
        const skuList = (item.skuList || []).map(sku => ({
          ...sku,
          price: sku.price != null ? ((sku.price / 100).toFixed(2)) : '0.00',
          specLabel: (sku.specInfo || []).map(s => s.specValues || '').join('/'),
        }));
        return {
          ...item,
          price: item.price != null ? ((item.price / 100).toFixed(2)) : '0.00',
          skuList,
          selectedSkuIndex: skuList.length === 1 ? 0 : -1, // 单 SKU 自动选中
        };
      });
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

  // ====== 选中 SKU ======
  onSkuSelect(e) {
    const { spuid, skuindex } = e.currentTarget.dataset;
    const idx = parseInt(skuindex);
    const goodsList = this.data.goodsList.map(item => {
      if (item.spuId === spuid) {
        return { ...item, selectedSkuIndex: item.selectedSkuIndex === idx ? -1 : idx };
      }
      return item;
    });
    this.setData({ goodsList });
  },

  // ====== 加购按钮 ======
  onAddCart(e) {
    const spuId = e.currentTarget.dataset.spuid;
    const item = this.data.goodsList.find(g => g.spuId === spuId);
    if (!item || item.selectedSkuIndex < 0) {
      wx.showToast({ title: '请先选择规格', icon: 'none' });
      return;
    }
    const sku = item.skuList[item.selectedSkuIndex];
    // TODO: 调用购物车接口
    wx.showToast({ title: `已加购: ${sku.specLabel}`, icon: 'success', duration: 1500 });
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
