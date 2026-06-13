import { get } from '../../utils/request';

export function getGoodsDetailsCommentsCount(spuId = '') {
  return get('/v1/goods/comments/count', { spuId });
}

export function getGoodsDetailsCommentList(spuId = '') {
  return get('/v1/goods/comments/list', { spuId });
}
