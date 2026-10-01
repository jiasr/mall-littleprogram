import { get } from '../../utils/request';

// 实时查询订单物流轨迹（后端向物流渠道实时拉取，非订单详情里的快照）
export function fetchOrderTrack(orderNo) {
  return get('/v1/order/track', { orderNo });
}
