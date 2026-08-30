import { get } from '../../utils/request';

/** 获取指定类型的协议内容（agreement=用户协议 privacy=隐私政策 about=关于我们），由管理后台配置 */
export function fetchAgreement(type) {
  return get('/v1/agreement/get', { type });
}
