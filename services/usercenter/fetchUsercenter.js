import { get } from '../../utils/request';

export function fetchUserCenter() {
  return get('/v1/user/info');
}
