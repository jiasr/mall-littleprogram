import { post } from '../../utils/request';

export function fetchSettleDetail(params) {
  return post('/v1/order/settle', params);
}

export function dispatchCommitPay(params) {
  return post('/v1/order/pay', params);
}

export function dispatchSupplementInvoice() {
  return Promise.resolve({});
}
