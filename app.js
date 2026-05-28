import updateManager from './common/updateManager';

App({

  // 全局请求地址配置
  globalData: {
    // 开发环境
    // baseUrl: 'http://localhost:3000/api',

    // 生产环境
    baseUrl: 'https://yourdomain.com/api',

    //wxlogin code
    userapplycode: "",

    // 其他常用接口
    api: {
      login: '/user/login',
      getUserInfo: '/user/info',
      getArticleList: '/article/list'
    }
  },

  onLaunch() {
    console.log('onLaunch');
    // 初始化云开发环境
    // wx.cloud.init({
    //   env: wx.cloud.DYNAMIC_CURRENT_ENV,
    //   traceUser: false
    // })

    // 检查登录状态
    this.checkLogin()
  },
  onHide() {
    // 小程序从前台进入后台时执行
    console.log('小程序隐藏');
  },

  onError(err) {
    // 小程序发生脚本错误时执行
    console.error('小程序错误', err);
  },

  onShow: function () {
    console.log('onShow');

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
          console.log(this.globalData.userapplycode)
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