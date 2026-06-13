import { get } from '../../utils/request';

export function fetchOrderDetail(params) {
  return get('/v1/order/detail', params);
}

export function fetchBusinessTime() {
  return Promise.resolve({});
}
