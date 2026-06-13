import { get } from '../../utils/request';

export function fetchGoodsList(pageIndex = 1, pageSize = 20) {
  return get('/v1/goods/simple-list', { pageIndex, pageSize });
}
