import { OrderStatus } from '../config';
import {
  fetchOrders,
  fetchOrdersCount,
} from '../../../services/order/orderList';
import { cosThumb, formatTime } from '../../../utils/util';

// 兼容后端两种时间格式：'YYYY-MM-DD HH:mm:ss' 字符串 / 毫秒时间戳
const formatCreateTime = (t) => {
  if (!t) return '';
  const s = String(t).trim();
  const isTimestamp = /^-?\d+(\.\d+)?$/.test(s);
  const text = formatTime(isTimestamp ? Number(s) : s, 'YYYY-MM-DD HH:mm:ss');
  return /Invalid|NaN/.test(text) ? '' : text;
};

Page({
  page: {
    size: 5,
    num: 1,
  },

  data: {
    tabs: [
      { key: -1, text: '全部' },
      { key: OrderStatus.PENDING_PAYMENT, text: '待付款', info: '' },
      { key: OrderStatus.PENDING_DELIVERY, text: '待发货', info: '' },
      { key: OrderStatus.PENDING_RECEIPT, text: '待收货', info: '' },
      { key: OrderStatus.COMPLETE, text: '已完成', info: '' },
    ],
    curTab: -1,
    orderList: [],
    listLoading: 0,
    pullDownRefreshing: false,
    emptyImg:
      'https://cdn-we-retail.ym.tencent.com/miniapp/order/empty-order-list.png',
    backRefresh: false,
    status: -1,
  },

  onLoad(query) {
    let status = parseInt(query.status);
    status = this.data.tabs.map((t) => t.key).includes(status) ? status : -1;
    this.init(status);
    this.pullDownRefresh = this.selectComponent('#wr-pull-down-refresh');
  },

  onShow() {
    if (!this.data.backRefresh) return;
    this.onRefresh();
    this.setData({ backRefresh: false });
  },

  onReachBottom() {
    if (this.data.listLoading === 0) {
      this.getOrderList(this.data.curTab);
    }
  },

  onPageScroll(e) {
    this.pullDownRefresh && this.pullDownRefresh.onPageScroll(e);
  },

  onPullDownRefresh_(e) {
    const { callback } = e.detail;
    this.setData({ pullDownRefreshing: true });
    this.refreshList(this.data.curTab)
      .then(() => {
        this.setData({ pullDownRefreshing: false });
        callback && callback();
      })
      .catch(() => {
        // 刷新失败也要收起指示器，避免卡在下拉状态
        this.setData({ pullDownRefreshing: false });
        callback && callback();
      });
  },

  init(status) {
    status = status !== undefined ? status : this.data.curTab;
    this.setData({
      status,
    });
    this.refreshList(status);
  },

  // 前端状态码 → 后端状态码映射
  statusMap: { 5: 0, 10: 1, 40: 2, 50: 3 },

  // 前端订单状态码 → 状态文字颜色（5待付款 10待发货 40待收货 50已完成 80已取消）
  // 仅待付款用主题红，其余统一黑色
  statusColorMap: {
    5: '#fa4126',
    10: '#333333',
    40: '#333333',
    50: '#333333',
    80: '#333333',
  },

  getOrderList(statusCode = -1, reset = false) {
    var params = {
      parameter: {
        pageSize: this.page.size,
        pageNum: this.page.num,
      },
    };
    if (statusCode !== -1) {
      params.parameter.orderStatus = this.statusMap[statusCode] !== undefined ? this.statusMap[statusCode] : statusCode;
    }
    this.setData({ listLoading: 1 });
    return fetchOrders(params)
      .then((res) => {
        this.page.num++;
        let orderList = [];
        if (res && res.data && res.data.orders) {
          orderList = (res.data.orders || []).map((order) => {
            const goodsList = (order.orderItemVOs || []).map((goods) => ({
              id: goods.id,
              thumb: cosThumb(goods.goodsPictureUrl, 60),
              title: goods.goodsName,
              skuId: goods.skuId,
              spuId: goods.spuId,
              // 列表接口字段：specInfo/realPrice/goodsCount；详情接口为 specifications/tagPrice/actualPrice/buyQuantity，做兼容
              specs: (goods.specInfo || goods.specifications || []).map(
                (spec) => spec.specValue,
              ),
              price:
                goods.realPrice !== undefined && goods.realPrice !== null
                  ? goods.realPrice
                  : goods.tagPrice || goods.actualPrice,
              num:
                goods.goodsCount !== undefined && goods.goodsCount !== null
                  ? goods.goodsCount
                  : goods.buyQuantity || 0,
              titlePrefixTags: goods.tagText ? [{ text: goods.tagText }] : [],
            }));
            const firstGoods = goodsList[0];
            return {
              id: order.id,
              orderNo: order.orderNo,
              parentOrderNo: order.parentOrderNo,
              storeId: order.storeId,
              storeName: order.storeName,
              status: order.orderStatus,
              statusDesc: order.orderStatusName,
              statusColor: this.statusColorMap[order.orderStatus] || '#333333',
              amount: order.paymentAmount,
              totalAmount: order.totalAmount,
              logisticsNo: (order.logisticsVO || {}).logisticsNo || '',
              createTime: order.createTime,
              createTimeText: formatCreateTime(order.createTime),
              goodsCount: goodsList.reduce(
                (sum, g) => sum + (g.num || 0),
                0,
              ), // 总件数 = 各 SKU 数量累加
              goodsList,
              single: goodsList.length === 1,
              firstGoods: firstGoods
                ? {
                    title: firstGoods.title,
                    specsText: (firstGoods.specs || []).join(' / '),
                    price: firstGoods.price,
                    num: firstGoods.num,
                    thumb: firstGoods.thumb,
                  }
                : null,
              buttons: order.buttonVOs || [],
              groupInfoVo: order.groupInfoVo,
              freightFee: order.freightFee,
            };
          });
        }
        this.setData({
          orderList: reset ? orderList : this.data.orderList.concat(orderList),
          listLoading: orderList.length > 0 ? 0 : 2,
        });
      })
      .catch((err) => {
        this.setData({ listLoading: 3 });
        return Promise.reject(err);
      });
  },

  onReTryLoad() {
    this.getOrderList(this.data.curTab);
  },

  onTabChange(e) {
    const { value } = e.detail;
    this.setData({
      status: value,
    });
    this.refreshList(value);
  },

  getOrdersCount() {
    return fetchOrdersCount().then((res) => {
      // 后端按 [待付款, 待发货, 待收货, 已完成] 顺序返回，与 tabs[1..] 一一对应（不含"全部"）
      const tabsCount = res.data || [];
      const { tabs } = this.data;
      tabs.forEach((tab, index) => {
        const tabCount = index > 0 ? tabsCount[index - 1] : null;
        if (tabCount) {
          tab.info = tabCount.orderNum;
        }
      });
      this.setData({ tabs });
    });
  },

  refreshList(status = -1) {
    this.page = {
      size: this.page.size,
      num: 1,
    };
    this.setData({ curTab: status, orderList: [] });

    return Promise.all([
      this.getOrderList(status, true),
      this.getOrdersCount(),
    ]);
  },

  onRefresh() {
    this.refreshList(this.data.curTab);
  },

  onOrderCardTap(e) {
    const { order } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order/order-detail/index?id=${order.id}`,
    });
  },
});
