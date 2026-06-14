import { get, post } from '../../utils/request';

/** 订单预览 */
export function previewOrder(data) {
  return post('/v1/order/preview', data);
}

/** 创建订单 */
export function createOrder(data) {
  return post('/v1/order/create', data);
}

/** 订单详情 */
export function getOrderDetail(orderId) {
  return get('/v1/order/detail', { orderId });
}

/** 取消订单 */
export function cancelOrder(orderId) {
  return post('/v1/order/cancel', { orderId });
}
