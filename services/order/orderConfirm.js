import { post } from '../../utils/request';

/** 结算预览（调用后端 preview，响应转成前端格式） */
export function fetchSettleDetail(params) {
  var goodsList = (params.goodsRequestList || []).map(function(g) {
    return { spuId: g.spuId, skuId: g.skuId, quantity: g.quantity || 1 };
  });
  var userAddressReq = params.userAddressReq || null;
  return post('/v1/order/preview', { items: goodsList }).then(function(preview) {
    if (!preview) return { data: {} };
    var totalItems = 0;
    var items = (preview.items || []).map(function(it) {
      totalItems += it.quantity || 0;
      return {
        skuId: it.skuId,
        spuId: it.spuId,
        goodsName: it.title,
        image: it.thumb,
        price: it.price,
        settlePrice: String(it.price),
        quantity: it.quantity,
        skuSpecLst: [{ specValue: it.specLabel }],
        storeId: '1000',
        reminderStock: 999,
        tagPrice: 0,
        tagText: null,
        roomId: null,
      };
    });
    return { data: {
      storeGoodsList: [{
        storeId: '1000',
        storeName: '',
        storeTotalPayAmount: preview.payAmount || 0,
        skuDetailVos: items,
      }],
      outOfStockGoodsList: [],
      abnormalDeliveryGoodsList: [],
      inValidGoodsList: [],
      limitGoodsList: [],
      couponList: [],
      userAddress: userAddressReq,  // ← 传入选中的地址，不覆盖
      totalPayAmount: String(preview.payAmount || 0),
      totalGoodsCount: totalItems,
      totalPromotionAmount: 0,
      totalCouponAmount: 0,
    }};
  });
}

export function dispatchCommitPay(params) {
  return post('/v1/order/pay', params);
}

export function dispatchSupplementInvoice() {
  return Promise.resolve({});
}
