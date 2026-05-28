import updateManager from './common/updateManager';

App({

  onLaunch() {
    console.log('onLaunch');
    // 初始化云开发环境
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: false
    })

    // 检查登录状态
    this.checkLogin()
  },

  onShow: function () {
    console.log('onShow');
    console.log(this.globalData.userapplycode)
    //updateManager();
  },

  async checkLogin() {
    console.log('checkLogin');
    wx.login({
      success(res) {
        console.log(res)
        if (res.code) {
          console.log('登录成功！' + res.code);
          this.globalData.userapplycode = res.code
          // 1. 获取到 code 后，发起网络请求将其发送到自己的后端服务器
          // wx.request({
          //   url: 'https://yourdomain.com/onLogin', // 替换为自己的后端接口地址
          //   data: {
          //     code: res.code
          //   },
          //   success(response) {
          //     console.log('后端登录成功', response.data);
          //     // 2. 通常后端会返回自定义登录态(token)，需要存储起来供后续使用
          //     wx.setStorageSync('userToken', response.data.token);
          //   }
          // })
        } else {
          // 获取 code 失败的处理
          console.log('登录失败！' + res.errMsg);
        }
      },
      fail(err) {
        // 接口调用失败（如网络问题、超时）
        console.error('wx.login 调用失败', err);
      }
    });
  },

  setUserInfo(userInfo) {

    this.globalData.userInfo = userInfo
    this.globalData.openid = userInfo.openid
    this.globalData.role = userInfo.role
  }

});