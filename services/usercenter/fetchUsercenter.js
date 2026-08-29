import { get, post } from '../../utils/request';
import { getEnvBaseUrl } from '../../utils/config';

export function fetchUserCenter() {
  return get('/v1/user/info');
}

/** 用户基础信息（昵称/头像/手机号），轻量接口，购物车等页面校验登录态用 */
export function fetchUserBaseInfo() {
  return get('/v1/user/base_info');
}

/** 各状态订单数量，个人中心订单入口角标用 */
export function fetchUserOrderCount() {
  return get('/v1/user/order_count');
}

/** 客服信息（服务时间/客服电话） */
export function fetchUserCustomerService() {
  return get('/v1/user/customer_service');
}

/** 更新用户头像/昵称 */
export function updateUserProfile(data) {
  return post('/v1/user/updateProfile', data);
}

/**
 * 上传头像：微信 chooseAvatar 返回的是本地临时路径(http://tmp/...)，不能直接存库，
 * 必须先上传到后端对象存储，拿到可访问的 public_url 后再调用 updateProfile 保存。
 * @returns {Promise<string>} public_url
 */
export function uploadAvatar(tempFilePath) {
  const app = getApp();
  const baseUrl = app ? app.globalData.baseUrl : getEnvBaseUrl();
  const token = app ? app.globalData.token || '' : '';

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${baseUrl}/v1/user/upload_avatar`,
      filePath: tempFilePath,
      name: 'file',
      formData: { scene: 'avatar' },
      header: {
        ...(token ? { token } : {}),
      },
      success(res) {
        try {
          const resp = JSON.parse(res.data);
          if (resp && resp.flag === true) {
            const data = resp.resData;
            // relative_url 用于存库(避免硬编码)；public_url 供本地预览
            const relativeUrl = (data && (data.relative_url || (data.data && data.data.relative_url))) || '';
            const publicUrl = (data && (data.public_url || (data.data && data.data.public_url))) || '';
            if (relativeUrl) {
              resolve({ relative_url: relativeUrl, public_url: publicUrl });
            } else {
              reject({ message: '上传成功但未返回图片地址' });
            }
          } else {
            const msg = (resp && (resp.errMessage || resp.exceptionMsg)) || '头像上传失败';
            reject({ message: msg });
          }
        } catch (e) {
          reject({ message: '头像上传响应解析失败' });
        }
      },
      fail(err) {
        reject({ message: '头像上传失败，请重试' });
      },
    });
  });
}

/** 手机号授权绑定 */
export function bindWxPhone(code) {
  return post('/v1/user/wx_phone', { code });
}
