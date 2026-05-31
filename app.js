import updateManager from './common/updateManager';

App({

  // 全局请求地址配置
  globalData: {
    // 开发环境
    baseUrl: 'http://localhost:8560',

    // 生产环境
    //baseUrl: 'https://yourdomain.com/api',

    //wxlogin code
    userapplycode: "",
    // system userid 
    userid: "",

    // 其他常用接口
    api: {
      login: '/user/login',
      getUserInfo: '/user/info',
      getArticleList: '/article/list'
    }
  },

  onLaunch() {
    console.log('onLaunch');
    console.log('checkLogin');
    wx.login({
      success: (res) => {
        console.log(res)
        if (res.code) {
          console.log('wx login success:get request code ' + res.code);
          // 1. 获取到 code 后，发起网络请求将其发送到自己的后端服务器
          wx.request({
            url: this.globalData.baseUrl + '/v1/user/wx_login', // 建议加上具体路径
            method: 'POST',
            data: {
              code: res.code
            },
            timeout: 60000,
            header: {
              'content-type': 'application/json'
            },
            success: (response) => {
              console.log('后端请求成功，获取userid', response.data.resData.userid);
              this.globalData.userid = response.data.resData.userid
            },
            fail() {
              console.log("后端请求失败")
            }
          })

        } else {
          // 获取 code 失败的处理
          console.log('登录失败！' + res.errMsg);
        }
      },
      fail(err) {
        // 接口调用失败（如网络问题、超时）
        console.log('wx.login 调用失败', err);
      }
    });

  },

  onHide() {
    // 小程序从前台进入后台时执行
    console.log('小程序隐藏');
  },

  onError(err) {
    // 小程序发生脚本错误时执行
    console.log('小程序错误');
  },

  onShow: function () {
    console.log('onShow');
  },

});