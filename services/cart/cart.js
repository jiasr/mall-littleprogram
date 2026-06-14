import { get, post } from '../../utils/request';

/** 获取购物车列表 */
export function fetchCartList() {
  return get('/v1/cart/list');
}

/** 加入购物车 */
export function addToCart(spuId, skuId, quantity = 1) {
  return post('/v1/cart/add', { spuId, skuId, quantity });
}

/** 更新购物车项（数量/选中） */
export function updateCart(cartId, data) {
  return post('/v1/cart/update', { cartId, ...data });
}

/** 删除购物车项 */
export function deleteCart(cartIds) {
  return post('/v1/cart/delete', { cartIds: Array.isArray(cartIds) ? cartIds : [cartIds] });
}

/** 清空购物车 */
export function clearCart() {
  return post('/v1/cart/clear');
}
