import { get } from '../../utils/request';

export function fetchActivity(id) {
  return get('/v1/activity/detail', { id });
}
