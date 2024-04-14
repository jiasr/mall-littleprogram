import updateManager from './common/updateManager';

App({
  onLaunch: function () {},
  onShow: function () {
    updateManager();

    /**
     * 初次加载判断网络情况
     * 无网络状态下根据实际情况进行调整
     */
    wx.getNetworkType({
      success(res) {
        const networkType = res.networkType
        console.log(networkType)
        if (networkType === 'none') {
          that.globalData.isConnected = false
          wx.showToast({
            title: '当前无网络',
            icon: 'loading',
            duration: 2000
          })
        }
      }
    });

    const subDomain = wx.getExtConfigSync().subDomain
    console.log(subDomain)
    // if (subDomain) {
    //   WXAPI.init(subDomain)
    // } else {
    //   WXAPI.init(CONFIG.subDomain)
    //   WXAPI.setMerchantId(CONFIG.merchantId)
    // }
    wx.showModal({
      title: '更新提示',
      content: subDomain,
    });

  },
});