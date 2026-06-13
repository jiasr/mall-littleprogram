import { get } from '../../utils/request';

export function fetchPerson() {
  return get('/v1/user/person');
}
