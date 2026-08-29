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

/** 删除订单（仅已完成/已取消） */
export function deleteOrder(orderId) {
  return post('/v1/order/delete', { orderId });
}

/** 确认收货 */
export function confirmOrder(orderId) {
  return post('/v1/order/confirm', { orderId });
}

/** 提醒发货 */
export function remindOrder(orderId) {
  return post('/v1/order/remind', { orderId });
}
