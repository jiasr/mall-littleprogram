import { get } from '../../utils/request';

export function fetchOrders(params) {
  return get('/v1/order/list', params);
}

export function fetchOrdersCount(params) {
  return get('/v1/order/count', params);
}
