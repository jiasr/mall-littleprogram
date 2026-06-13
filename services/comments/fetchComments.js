import { get } from '../../utils/request';

export function fetchComments(spuId = '') {
  return get('/v1/goods/comments', { spuId });
}
