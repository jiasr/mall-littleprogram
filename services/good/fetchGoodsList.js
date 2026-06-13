import { get } from '../../utils/request';

export function fetchGoodsList(params = {}) {
  return get('/v1/goods/list', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    keyword: params.keyword || '',
    sort: params.sort || 0,
    sortType: params.sortType || '0',
    minPrice: params.minPrice || '',
    maxPrice: params.maxPrice || '',
    categoryId: params.categoryId || '',
  });
}
