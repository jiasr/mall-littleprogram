import { get } from '../../utils/request';

export function getCategoryList() {
  return get('/v1/goodscatalog/tree');
}
