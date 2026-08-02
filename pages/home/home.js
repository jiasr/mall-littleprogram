import {
  fetchHome,
  fetchCategoryList
} from '../../services/home/home';
import {
  fetchGoodsList
} from '../../services/good/fetchGoods';
import Toast from 'tdesign-miniprogram/toast/index';



Page({
  data: {
    imgSrcs: [],
    tabList: [],
    goodsList: [],
    goodsListLoadStatus: 0,
    pageLoading: false,
    current: 1,
    autoplay: true,
    duration: '500',
    interval: 5000,
    navigation: {
      type: 'dots'
    },
    swiperImageProps: {
      mode: 'scaleToFill'
    },
    categoryList: [],
    categoryPages: [],
    categorySwiperCurrent: 0,
  },

  goodListPagination: {
    index: 0,
    num: 20,
  },

  privateData: {
    tabIndex: 0,
  },

  onShow() {
    //自定义tabbar加载，位置位于custom-tab-bar目录
    this.getTabBar().init();
    // 每次进入首页刷新商品列表
    this.init();
  },

  onLoad() {
    this.init();


  },


  onReachBottom() {
    if (this.data.goodsListLoadStatus === 0) {
      this.loadGoodsList();
    }
  },

  onPullDownRefresh() {
    this.init();
  },

  init() {
    this.loadHomePage();
    this.loadCategoryData();
  },

  loadCategoryData() {
    fetchCategoryList().then((tree = []) => {
      // 提取一级分类（level=1 或 parentid=0/不存在）
      const level1 = tree.filter(item => item.level === 1 || item.parentid === '0' || !item.parentid);
      // 按每页10个分组
      const pageSize = 10;
      const pages = [];
      for (let i = 0; i < level1.length; i += pageSize) {
        pages.push(level1.slice(i, i + pageSize));
      }
      this.setData({
        categoryList: level1,
        categoryPages: pages,
      });
    }).catch(() => {
      console.log('获取分类列表失败');
    });
  },

  onCategorySwiperChange(e) {
    this.setData({
      categorySwiperCurrent: e.detail.current,
    });
  },

  navToCategory(e) {
    const { id } = e.currentTarget.dataset;
    // 通过 Storage 传参给分类页（switchTab 不支持参数）
    wx.setStorageSync('navCategoryId', id);
    wx.switchTab({
      url: '/pages/goods/category/index',
    });
  },

  loadHomePage() {
    wx.stopPullDownRefresh();

    this.setData({
      pageLoading: true,
    });
    fetchHome().then(({
      swiper,
      tabList
    }) => {
      this.setData({
        tabList,
        imgSrcs: swiper,
        pageLoading: false,
      });
      this.loadGoodsList(true);

    });
  },

  tabChangeHandle(e) {
    this.privateData.tabIndex = e.detail;
    this.loadGoodsList(true);
  },

  onReTry() {
    this.loadGoodsList();
  },

  async loadGoodsList(fresh = false) {
    if (fresh) {
      wx.pageScrollTo({
        scrollTop: 0,
      });
    }

    this.setData({
      goodsListLoadStatus: 1
    });

    const pageSize = this.goodListPagination.num;
    let pageIndex = this.privateData.tabIndex * pageSize + this.goodListPagination.index + 1;
    if (fresh) {
      pageIndex = 0;
    }

    try {
      const nextList = await fetchGoodsList(pageIndex, pageSize);
      this.setData({
        goodsList: fresh ? nextList : this.data.goodsList.concat(nextList),
        goodsListLoadStatus: 0,
      });

      this.goodListPagination.index = pageIndex;
      this.goodListPagination.num = pageSize;
    } catch (err) {
      this.setData({
        goodsListLoadStatus: 3
      });
    }

  },

  // changeTitle() {
  //   let newTitle = wx.getStorageSync('userToken');

  //   wx.setNavigationBarTitle({
  //     title: newTitle
  //   });

  // },
  goodListClickHandle(e) {
    const {
      index
    } = e.detail;
    const {
      spuId
    } = this.data.goodsList[index];
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${spuId}`,
    });
  },

  goodListAddCartHandle(e) {
    const { goods } = e.detail;
    if (!goods || !goods.spuId) return;
    // 跳转到详情页，由详情页处理规格选择和加购
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${goods.spuId}`,
    });
  },

  navToActivityDetail({
    detail
  }) {
    const {
      index: promotionID = 0
    } = detail || {};
    wx.navigateTo({
      url: `/pages/promotion-detail/index?promotion_id=${promotionID}`,
    });
  },
});