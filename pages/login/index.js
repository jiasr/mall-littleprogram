import Toast from 'tdesign-miniprogram/toast/index';
import {
  bindWxPhone,
  updateUserProfile,
  uploadAvatar,
} from '../../services/usercenter/fetchUsercenter';
import { fetchAgreement } from '../../services/agreement/fetchAgreement';
import { setPhoneBound } from '../../utils/auth';

Page({
  data: {
    agreed: false, // 是否已勾选同意协议
    phoneBound: false, // 手机号是否已绑定
    avatarUrl: '', // 头像URL
    nickName: '', // 昵称
    loading: false,
  },

  onLoad(options) {
    // 记录来源（cart=购物车 / usercenter=我的），登录成功后跳回
    this.source = options.from || '';
    // 预加载用户协议/隐私政策，点击查看时直接展示，无需等待接口返回
    this.preloadAgreements();
  },

  // 预加载协议内容到全局缓存（静默失败，点击时协议页会兜底拉取）
  preloadAgreements() {
    const app = getApp();
    if (!app.globalData.agreements) {
      app.globalData.agreements = {};
      Promise.all([
        fetchAgreement('agreement').catch(() => null),
        fetchAgreement('privacy').catch(() => null),
      ]).then(([agreement, privacy]) => {
        if (agreement && agreement.content) app.globalData.agreements.agreement = agreement;
        if (privacy && privacy.content) app.globalData.agreements.privacy = privacy;
      });
    }
  },

  // 勾选/取消协议
  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  // 查看用户协议（内容由管理后台配置）
  onViewAgreement() {
    wx.navigateTo({ url: '/pages/agreement/detail/index?type=agreement' });
  },

  // 查看隐私政策（内容由管理后台配置）
  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/detail/index?type=privacy' });
  },

  // 手机号授权登录
  onGetPhoneNumber(e) {
    if (!this.data.agreed) {
      Toast({ context: this, selector: '#t-toast', message: '请先勾选并同意用户协议和隐私政策' });
      return;
    }
    const { code } = e.detail;
    if (!code) {
      Toast({ context: this, selector: '#t-toast', message: '已取消手机号授权', icon: '' });
      return;
    }
    Toast({ context: this, selector: '#t-toast', message: '绑定中...', icon: '' });
    bindWxPhone(code)
      .then(() => {
        this.setData({ phoneBound: true });
        // 写入统一登录态缓存，其他页面校验直接命中
        setPhoneBound(true);
        Toast({ context: this, selector: '#t-toast', message: '手机号绑定成功', theme: 'success' });
      })
      .catch((err) => {
        Toast({
          context: this,
          selector: '#t-toast',
          message: (err && err.message) || '手机号绑定失败',
          theme: 'error',
        });
      });
  },

  // 选择头像：先上传到存储，存相对路径、用完整URL预览
  onChooseAvatar(e) {
    const tempUrl = e.detail.avatarUrl;
    if (!tempUrl) return;
    // 先本地预览（临时路径）
    this.setData({ avatarUrl: tempUrl });
    uploadAvatar(tempUrl)
      .then(({ relative_url, public_url }) => {
        // 预览用完整URL；存库用相对路径(避免硬编码IP/端口)
        if (public_url) this.setData({ avatarUrl: public_url });
        return updateUserProfile({ avatar: relative_url });
      })
      .catch(() => {
        Toast({ context: this, selector: '#t-toast', message: '头像上传失败', theme: 'error' });
      });
  },

  // 昵称输入：每次输入/选中微信推荐昵称都即时保存，避免选中后不生效
  onNicknameInput(e) {
    const nickName = e.detail.value || '';
    // 不 setData 回绑 value，避免输入框重置；仅保存到后端
    if (nickName.trim()) {
      this._saveNickname(nickName);
    }
  },

  // 昵称确认/失焦
  onNicknameChange(e) {
    const nickName = (e.detail.value || '').trim();
    if (!nickName) return;
    this._saveNickname(nickName);
  },

  // 保存昵称到后端（防抖，避免频繁请求）
  _saveNickname(nickName) {
    if (this._savingNick) return;
    this._savingNick = true;
    updateUserProfile({ nickName })
      .then(() => {
        this.setData({ nickName });
        this._savingNick = false;
      })
      .catch(() => {
        this._savingNick = false;
      });
  },

  // 完成登录
  onComplete() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    // 手机号已绑定即视为登录完成，头像/昵称为选填
    Toast({ context: this, selector: '#t-toast', message: '登录成功', theme: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 600);
  },
});
