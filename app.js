import updateManager from './common/updateManager';
import {
  post
} from './utils/request';
import {
  getEnvBaseUrl
} from './utils/config';
import {
  fetchCartList
} from './services/cart/cart';
import * as cartStore from './services/cart/cartStore';

App({

  globalData: {
    baseUrl: getEnvBaseUrl(),
    userapplycode: '',
    userid: '',
    token: '',
    cartCount: 0,
    api: {
      login: '/user/login',
      getUserInfo: '/user/info',
      getArticleList: '/article/list',
    },
  },

  updateCartBadge() {
    var pages = getCurrentPages();
    if (pages && pages.length > 0) {
      var tabBar = pages[pages.length - 1].getTabBar();
      if (tabBar && tabBar.updateCartBadge) {
        tabBar.updateCartBadge();
      }
    }
  },

  // 加购成功后自增全局购物车数量并刷新 tabbar 徽标（所有加购页面直接调用）
  addCartCount(num = 1) {
    this.globalData.cartCount = (this.globalData.cartCount || 0) + num;
    this.updateCartBadge();
  },

  // 设置全局购物车数量并刷新徽标（供购物车列表/登录后校准）
  setCartCount(num) {
    this.globalData.cartCount = num || 0;
    this.updateCartBadge();
  },

  // 登录后购物车全面校准：补提交未同步变更 → 合并游客车 → 拉真实件数校准徽标
  afterLoginCartSync() {
    const that = this;
    cartStore.init(this.globalData.userid);
    // 1. 补提交上次进程被杀遗留的本地变更
    cartStore
      .flush()
      .then(() => cartStore.mergeGuestCartIfAny())
      .then(() => {
        // 3. 从服务端拉取真实件数校准徽标
        that.syncCartCount();
      });
  },

  // 登录成功后从购物车列表拉取真实件数校准全局数量（静默，失败忽略）
  syncCartCount() {
    if (this._syncingCart) return;
    this._syncingCart = true;
    var that = this;
    fetchCartList()
      .then(function (data) {
        var count = 0;
        if (data && data.validItems) {
          data.validItems.forEach(function (item) {
            count += item.quantity || 0;
          });
        }
        that.setCartCount(count);
      })
      .catch(function () {})
      .then(function () {
        that._syncingCart = false;
      });
  },

  onLaunch() {
    wx.login({
      success: (res) => {
        if (res.code) {
          post('/v1/user/wx_login', {
              code: res.code
            })
            .then((data) => {
              if (data && data.userid) {
                this.globalData.userid = data.userid;
                this.globalData.token = data.userid;
                console.log('登录成功，userid:', data.userid);
                // 登录后购物车全面校准：补提交 + 合并游客车 + 拉真实件数
                this.afterLoginCartSync();
              }
            })
            .catch((err) => {
              console.log('登录请求失败:', err.message || err);
            });
        } else {
          console.log('登录失败！' + res.errMsg);
        }
      },
      fail(err) {
        console.log('wx.login 调用失败', err);
      },
    });
  },

  onHide() {
    console.log('小程序隐藏');
  },

  onError(err) {
    console.log('小程序错误');
  },

  onShow() {
    console.log('onShow');
  },
});