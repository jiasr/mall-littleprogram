import { get, post } from '../../utils/request';

export function fetchUserCenter() {
  return get('/v1/user/info');
}

/** 更新用户头像/昵称 */
export function updateUserProfile(data) {
  return post('/v1/user/updateProfile', data);
}

/** 手机号授权绑定 */
export function bindWxPhone(code) {
  return post('/v1/user/wx_phone', { code });
}
