import { get, post, del } from '../../utils/request';

export function fetchDeliveryAddressList() {
  return get('/v1/address/list');
}

export function addAddress(data) {
  return post('/v1/address/add', data);
}

export function deleteAddress(id) {
  return post('/v1/address/delete', { id });
}

export function updateAddress(data) {
  return post('/v1/address/update', data);
}
