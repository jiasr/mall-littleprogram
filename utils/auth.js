import { fetchUserBaseInfo } from '../services/usercenter/fetchUsercenter';

/**
 * 统一登录校验工具
 * 登录态判定标准：手机号已绑定（userInfo.phoneNumber 有值），不再以 userid 为准。
 * 所有"需要登录才能操作"的入口统一走 ensurePhoneLogin，禁止各处单独校验。
 * 未绑定手机号时统一"先弹提示，用户确认后才跳转登录页"，不自动跳转。
 */

// 会话级手机号绑定状态缓存：null=未查询 true=已绑定 false=未绑定
let phoneBound = null;

/** 更新手机号绑定缓存（登录页绑定成功 / 各页拿到用户信息时调用） */
export function setPhoneBound(bound) {
  phoneBound = !!bound;
}

/** 强制刷新手机号绑定状态：先失效缓存再查询后端 */
export function refreshPhoneBound() {
  phoneBound = null;
  return isPhoneBound();
}

/** 查询手机号是否已绑定：命中缓存直接返回，否则请求后端并写缓存（失败按未绑定处理，不阻塞） */
export function isPhoneBound() {
  if (phoneBound !== null) return Promise.resolve(phoneBound);
  return fetchUserBaseInfo()
    .then((data) => {
      phoneBound = !!(data && data.userInfo && data.userInfo.phoneNumber);
      return phoneBound;
    })
    .catch(() => false);
}

/** 跳转登录页（from 标记来源，登录成功后返回原页面） */
export function goLogin(from = 'cart') {
  wx.navigateTo({ url: `/pages/login/index?from=${from}` });
}

/**
 * 统一登录校验：手机号已绑定返回 true；未绑定则弹窗提示，用户点「去登录」才跳转登录页，返回 false。
 * @param {object} options
 *   from: 来源标识（cart/usercenter），默认 cart
 *   message: 未登录提示文案，默认「请先登录」
 *   prompt: 未绑定时是否弹窗提示，默认 true；设为 false 可静默拦截（用于已有其他登录引导的场景，避免重复弹窗）
 */
export async function ensurePhoneLogin(options = {}) {
  const { from = 'cart', message = '请先登录', prompt = true } = options;
  const bound = await isPhoneBound();
  if (bound) return true;
  if (prompt) {
    wx.showModal({
      title: '提示',
      content: message,
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) goLogin(from);
      },
    });
  }
  return false;
}
