import { cosThumb, formatTime } from '../../../utils/util';
import { OrderStatus, LogisticsIconMap, buildOrderButtons } from '../config';
import {
  fetchBusinessTime,
  fetchOrderDetail,
} from '../../../services/order/orderDetail';
import Toast from 'tdesign-miniprogram/toast/index';

// 前端订单状态码 → 状态文字颜色（5待付款 10待发货 40待收货 50已完成 80已取消）
// 仅待付款用主题红，其余统一黑色
const STATUS_COLOR_MAP = {
  5: '#fa4126',
  10: '#333333',
  40: '#333333',
  50: '#333333',
  80: '#333333',
};

Page({
  data: {
    pageLoading: true,
    order: {}, // 后台返回的原始数据
    _order: {}, // 内部使用和提供给 order-card 的数据
    storeDetail: {},
    countDownTime: null,
    addressEditable: false,
    backRefresh: false, // 用于接收其他页面back时的状态
    formatCreateTime: '', //格式化订单创建时间
    logisticsNodes: [],
    /** 订单评论状态 */
    orderHasCommented: true,
    showStatusPopup: false,
    orderStatusLogs: [],
  },

  onLoad(query) {
    this.orderId = parseInt(query.id);
    this.init();
    this.navbar = this.selectComponent('#navbar');
    this.pullDownRefresh = this.selectComponent('#wr-pull-down-refresh');
  },

  onShow() {
    // 当从其他页面返回，并且 backRefresh 被置为 true 时，刷新数据
    if (!this.data.backRefresh) return;
    this.onRefresh();
    this.setData({ backRefresh: false });
  },

  onPageScroll(e) {
    this.pullDownRefresh && this.pullDownRefresh.onPageScroll(e);
  },

  onImgError(e) {
    if (e.detail) {
      console.error('img 加载失败');
    }
  },

  // 页面初始化，会展示pageLoading
  init() {
    this.setData({ pageLoading: true });
    this.getStoreDetail();
    this.getDetail()
      .then(() => {
        this.setData({ pageLoading: false });
      })
      .catch((e) => {
        console.error(e);
      });
  },

  // 页面刷新，展示下拉刷新
  onRefresh() {
    this.init();
    // 如果上一页为订单列表，通知其刷新数据
    const pages = getCurrentPages();
    const lastPage = pages[pages.length - 2];
    if (lastPage) {
      lastPage.data.backRefresh = true;
    }
  },

  // 页面刷新，展示下拉刷新
  onPullDownRefresh_(e) {
    const { callback } = e.detail;
    return this.getDetail().then(() => callback && callback());
  },

  getDetail() {
    const params = {
      id: this.orderId,
    };
    return fetchOrderDetail(params).then((res) => {
      const order = res;
      const goodsList = (order.orderItemVOs || []).map((goods) =>
        Object.assign({}, goods, {
          id: goods.id,
          thumb: cosThumb(goods.goodsPictureUrl, 60),
          title: goods.goodsName,
          skuId: goods.skuId,
          spuId: goods.spuId,
          specs: (goods.specifications || []).map((s) => s.specValue),
          specsText: (goods.specifications || [])
            .map((s) => s.specValue)
            .join(' / '),
          price: goods.tagPrice ? goods.tagPrice : goods.actualPrice, // 商品销售单价, 优先取限时活动价
          num: goods.buyQuantity,
          titlePrefixTags: goods.tagText ? [{ text: goods.tagText }] : [],
          buttons: goods.buttonVOs || [],
        }),
      );
      const _order = {
        id: order.orderId,
        orderNo: order.orderNo,
        parentOrderNo: order.parentOrderNo,
        storeId: order.storeId,
        storeName: order.storeName,
        status: order.orderStatus,
        statusDesc: order.orderStatusName,
        statusColor: STATUS_COLOR_MAP[order.orderStatus] || '#333333',
        amount: order.paymentAmount,
        totalAmount: order.goodsAmountApp,
        logisticsNo: order.logisticsVO.logisticsNo,
        goodsList,
        buttons:
          order.buttonVOs && order.buttonVOs.length
            ? order.buttonVOs
            : buildOrderButtons(order.orderStatus),
        createTime: order.createTime,
        receiverAddress: order.consigneeAddress || '',
        groupInfoVo: order.groupInfoVo,
      };
      this.setData({
        order,
        _order,
        formatCreateTime: formatTime(
          order.createTime,
          'YYYY-MM-DD HH:mm',
        ), // 格式化订单创建时间
        countDownTime: this.computeCountDownTime(order),
        addressEditable: false, // 禁止修改收货地址
        isPaid: !!order.paidAt,
        invoiceStatus: this.datermineInvoiceStatus(order),
        invoiceDesc: order.invoiceDesc,
        invoiceType:
          order.invoiceVO?.invoiceType === 5 ? '电子普通发票' : '不开发票', //是否开票 0-不开 5-电子发票
        logisticsNodes: this.flattenNodes(order.trajectoryVos || []),
        orderStatusLogs: this.buildOrderStatusLogs(order),
      });
    });
  },

  // 展开物流节点
  flattenNodes(nodes) {
    return (nodes || []).reduce((res, node) => {
      return (node.nodes || []).reduce((res1, subNode, index) => {
        res1.push({
          title: index === 0 ? node.title : '', // 子节点中仅第一个显示title
          desc: subNode.status,
          date: formatTime(+subNode.timestamp, 'YYYY-MM-DD HH:mm:ss'),
          icon: index === 0 ? LogisticsIconMap[node.code] || '' : '', // 子节点中仅第一个显示icon
        });
        return res1;
      }, res);
    }, []);
  },

  datermineInvoiceStatus(order) {
    // 1-已开票
    // 2-未开票（可补开）
    // 3-未开票
    // 4-门店不支持开票
    return order.invoiceStatus;
  },

  // 拼接省市区（后端已拼接好 consigneeAddress，无需再拼接）

  getStoreDetail() {
    fetchBusinessTime().then((res) => {
      const data = res || {};
      const storeDetail = {
        storeTel: data.telphone || '',
        storeBusiness: (data.businessTime || []).join('\n'),
      };
      this.setData({ storeDetail });
    });
  },

  // 仅对待支付状态计算付款倒计时
  // 返回时间若是大于2020.01.01，说明返回的是关闭时间，否则说明返回的直接就是剩余时间
  computeCountDownTime(order) {
    if (order.orderStatus !== OrderStatus.PENDING_PAYMENT) return null;
    return order.autoCancelTime > 1577808000000
      ? order.autoCancelTime - Date.now()
      : order.autoCancelTime;
  },

  // 根据订单字段拼装状态流转记录（下单/支付/发货/完成/取消）
  buildOrderStatusLogs(order) {
    const logs = [];
    if (order.createTime) {
      logs.push({ desc: '订单提交成功', time: order.createTime });
    }
    if (order.paidAt) {
      logs.push({ desc: '支付成功', time: order.paidAt });
    }
    switch (order.orderStatus) {
      case 40: // 待收货
        logs.push({ desc: '商家已发货', time: '' });
        break;
      case 50: // 已完成
        logs.push({ desc: '商家已发货', time: '' });
        logs.push({ desc: '订单已完成', time: '' });
        break;
      case 80: // 已取消
        logs.push({ desc: '订单已取消', time: '' });
        break;
      default:
        break;
    }
    if (logs.length) {
      logs[logs.length - 1].current = true; // 标记当前所处状态
    }
    return logs;
  },

  onShowOrderStatus() {
    this.setData({ showStatusPopup: true });
  },

  onCloseStatusPopup() {
    this.setData({ showStatusPopup: false });
  },

  onStatusPopupVisibleChange(e) {
    if (e.detail && e.detail.visible === false) {
      this.setData({ showStatusPopup: false });
    }
  },

  onCountDownFinish() {
    //this.setData({ countDownTime: -1 });
    const { countDownTime, order } = this.data;
    if (
      countDownTime > 0 ||
      (order && order.groupInfoVo && order.groupInfoVo.residueTime > 0)
    ) {
      this.onRefresh();
    }
  },

  onGoodsCardTap(e) {
    const { index } = e.currentTarget.dataset;
    const goods = this.data.order.orderItemVOs[index];
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${goods.spuId}` });
  },

  onEditAddressTap() {
    // 已禁用地址修改功能
  },

  onOrderNumCopy() {
    wx.setClipboardData({
      data: this.data.order.orderNo,
    });
  },

  onDeliveryNumCopy() {
    wx.setClipboardData({
      data: this.data.order.logisticsVO.logisticsNo,
    });
  },

  onToInvoice() {
    wx.navigateTo({
      url: `/pages/order/invoice/index?orderNo=${this.data._order.orderNo}`,
    });
  },

  onSuppleMentInvoice() {
    wx.navigateTo({
      url: `/pages/order/receipt/index?orderNo=${this.data._order.orderNo}`,
    });
  },

  onDeliveryClick() {
    const logisticsData = {
      nodes: this.data.logisticsNodes,
      company: this.data.order.logisticsVO.logisticsCompanyName,
      logisticsNo: this.data.order.logisticsVO.logisticsNo,
      phoneNumber: this.data.order.logisticsVO.logisticsCompanyTel,
    };
    wx.navigateTo({
      url: `/pages/order/delivery-detail/index?data=${encodeURIComponent(
        JSON.stringify(logisticsData),
      )}`,
    });
  },

  /** 跳转订单评价 */
  navToCommentCreate() {
    wx.navigateTo({
      url: `/pages/order/createComment/index?orderNo=${this.orderNo}`,
    });
  },

  /** 跳转拼团详情/分享页*/
  toGrouponDetail() {
    wx.showToast({ title: '点击了拼团' });
  },

  clickService() {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '您点击了联系客服',
    });
  },

  onOrderInvoiceView() {
    wx.navigateTo({
      url: `/pages/order/invoice/index?orderNo=${this.orderNo}`,
    });
  },
});
