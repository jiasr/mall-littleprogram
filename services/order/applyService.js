import { get, post } from '../../utils/request';

export function fetchRightsPreview(params) {
  return get('/v1/order/rights/preview', params);
}

export function dispatchConfirmReceived() {
  return post('/v1/order/confirm-received');
}

export function fetchApplyReasonList(params) {
  return get('/v1/order/apply-reason', params);
}

export function dispatchApplyService(params) {
  return post('/v1/order/apply-service', params);
}
