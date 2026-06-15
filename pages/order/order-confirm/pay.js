import Dialog from 'tdesign-miniprogram/dialog/index';
import Toast from 'tdesign-miniprogram/toast/index';

import { dispatchCommitPay } from '../../../services/order/orderConfirm';

// 真实的提交支付
export const commitPay = (params) => {
  return dispatchCommitPay({
    goodsRequestList: params.goodsRequestList,
    invoiceRequest: params.invoiceRequest,
    userAddressReq: params.userAddressReq,
    currency: params.currency || 'CNY',
    logisticsType: params.logisticsType || 1,
    orderType: params.orderType || 0,
    payType: params.payType || 1,
    totalAmount: params.totalAmount,
    userName: params.userName,
    payWay: 1,
    authorizationCode: '',
    storeInfoList: params.storeInfoList,
    couponList: params.couponList,
    groupInfo: params.groupInfo,
  });
};

export const paySuccess = (payOrderInfo) => {
  var payAmt = payOrderInfo.payAmt;
  var tradeNo = payOrderInfo.tradeNo;
  var params = 'totalPaid=' + payAmt + '&orderNo=' + tradeNo;
  wx.redirectTo({ url: '/pages/order/pay-result/index?' + params });
};

export const payFail = (payOrderInfo, resultMsg) => {
  if (resultMsg === 'requestPayment:fail cancel') {
    Dialog.confirm({
      title: '是否放弃付款',
      content: '商品可能很快就会被抢空哦，是否放弃付款？',
      confirmBtn: '放弃',
      cancelBtn: '继续付款',
    }).then(function() {
      wx.redirectTo({ url: '/pages/order/order-list/index' });
    });
  } else {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '支付失败：' + (resultMsg || ''),
      duration: 2000,
      icon: 'close-circle',
    });
    setTimeout(function() {
      wx.redirectTo({ url: '/pages/order/order-list/index' });
    }, 2000);
  }
};

/** 获取微信支付参数 */
function getPayParams(orderId) {
  var app = getApp();
  var baseUrl = app ? app.globalData.baseUrl : 'http://localhost:8560';
  var token = app ? app.globalData.token || app.globalData.userid || '' : '';
  return new Promise(function(resolve, reject) {
    wx.request({
      url: baseUrl + '/v1/order/pay',
      method: 'POST',
      data: { orderId: orderId },
      header: { 'content-type': 'application/json', 'token': token },
      success: function(res) {
        var resp = res.data;
        if (resp && resp.flag === true && resp.resData && resp.resData.paySign) {
          resolve(resp.resData);
        } else {
          reject(new Error(resp.resData ? (resp.resData.message || '获取支付参数失败') : '请求失败'));
        }
      },
      fail: function() { reject(new Error('网络异常')); },
    });
  });
}

/** 微信支付（调起 wx.requestPayment） */
export const wechatPayOrder = (payOrderInfo) => {
  var orderId = payOrderInfo.tradeNo || payOrderInfo.orderId;
  console.log('[pay] wechatPayOrder orderId:', orderId);
  if (!orderId) {
    payFail(payOrderInfo, 'orderId不能为空');
    return Promise.reject(new Error('orderId不能为空'));
  }
  return getPayParams(orderId).then(function(res) {
    console.log('[pay] getPayParams success, paySign:', res.paySign ? 'OK' : 'NONE');
    if (!res.paySign) {
      wx.showToast({ title: '获取支付参数失败', icon: 'none' });
      return Promise.reject(new Error('paySign为空'));
    }
    var ps = res.paySign;
    return new Promise(function(resolve, reject) {
      wx.requestPayment({
        timeStamp: ps.timeStamp,
        nonceStr: ps.nonceStr,
        package: ps.package,
        signType: ps.signType,
        paySign: ps.paySign,
        success: function() {
          console.log('[pay] wx.requestPayment success');
          paySuccess({ tradeNo: orderId, payAmt: res.payAmount });
          resolve();
        },
        fail: function(err) {
          console.log('[pay] wx.requestPayment fail:', err.errMsg);
          payFail(payOrderInfo, err.errMsg);
          reject(err);
        },
      });
    });
  }).catch(function(err) {
    console.error('[pay] 支付流程失败:', err.message || err);
    wx.showToast({ title: err.message || '支付失败', icon: 'none', duration: 2000 });
  });
};
