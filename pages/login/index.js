import Toast from 'tdesign-miniprogram/toast/index';
import {
  bindWxPhone,
  updateUserProfile,
  uploadAvatar,
} from '../../services/usercenter/fetchUsercenter';

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
  },

  // 勾选/取消协议
  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  // 查看用户协议（占位，后续可接协议页）
  onViewAgreement() {
    Toast({ context: this, selector: '#t-toast', message: '用户协议即将上线', icon: '' });
  },

  // 查看隐私政策（占位，后续可接协议页）
  onViewPrivacy() {
    Toast({ context: this, selector: '#t-toast', message: '隐私政策即将上线', icon: '' });
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

  // 选择头像：先上传到存储，拿到URL
  onChooseAvatar(e) {
    const tempUrl = e.detail.avatarUrl;
    if (!tempUrl) return;
    // 先本地预览
    this.setData({ avatarUrl: tempUrl });
    uploadAvatar(tempUrl)
      .then((publicUrl) => {
        this.setData({ avatarUrl: publicUrl });
        // 保存头像到后端
        return updateUserProfile({ avatar: publicUrl });
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
