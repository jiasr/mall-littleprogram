import { get } from '../../utils/request';

export function fetchGood(spuId = '') {
  return get('/v1/goods/detail', { spuId });
}
