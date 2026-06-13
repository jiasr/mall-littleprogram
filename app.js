import updateManager from './common/updateManager';
import { post } from './utils/request';

App({

  globalData: {
    baseUrl: 'http://localhost:8560',
    userapplycode: '',
    userid: '',
    token: '',
    api: {
      login: '/user/login',
      getUserInfo: '/user/info',
      getArticleList: '/article/list',
    },
  },

  onLaunch() {
    wx.login({
      success: (res) => {
        if (res.code) {
          post('/v1/user/wx_login', { code: res.code })
            .then((data) => {
              if (data && data.userid) {
                this.globalData.userid = data.userid;
                console.log('登录成功，userid:', data.userid);
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