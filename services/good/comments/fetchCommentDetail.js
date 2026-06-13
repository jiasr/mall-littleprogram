import { get } from '../../../utils/request';

export function getCommentDetail(params) {
  return get('/v1/goods/comments/detail', params);
}
