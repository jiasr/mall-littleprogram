import TabMenu from './data';
Component({
  data: {
    active: 0,
    list: TabMenu,
    cartCount: 0,
  },

  lifetimes: {
    attached() {
      this.updateCartBadge();
    },
  },

  pageLifetimes: {
    show() {
      this.updateCartBadge();
    },
  },

  methods: {
    onChange(event) {
      this.setData({
        active: event.detail.value
      });
      wx.switchTab({
        url: this.data.list[event.detail.value].url.startsWith('/') ?
          this.data.list[event.detail.value].url : `/${this.data.list[event.detail.value].url}`,
      });
    },

    init() {
      var page = getCurrentPages().pop();
      var route = page ? page.route.split('?')[0] : '';
      var active = this.data.list.findIndex(
        function (item) {
          return (item.url.startsWith('/') ? item.url.substr(1) : item.url) === route;
        }
      );
      this.setData({
        active: active
      });
      this.updateCartBadge();
    },

    updateCartBadge() {
      console.log("updateCartBadge")
      var app = getApp();
      var count = (app && app.globalData && app.globalData.cartCount) || 0;
      this.setData({
        cartCount: count
      });
      console.log("updateCartBadge:" + count)
    },
  },
});