// 订单状态码与后端统一（0待付款 1待发货 2待收货 3已完成 4已取消）
export const OrderStatus = {
  PENDING_PAYMENT: 0, // 待支付
  PENDING_DELIVERY: 1, // 待发货
  PENDING_RECEIPT: 2, // 待收货
  COMPLETE: 3, // 已完成/待评价
  PAYMENT_TIMEOUT: 4, // 已取消，支付超时
  CANCELED_NOT_PAYMENT: 4, // 已取消，未支付主动取消
  CANCELED_PAYMENT: 4, // 已取消，已支付主动取消
  CANCELED_REJECTION: 4, // 已取消，拒收
};

// 售后状态 10:待审核,20:已审核,30:已收货,40:收货异常,50:已完成,60:已关闭;
export const AfterServiceStatus = {
  TO_AUDIT: 10, // 待审核
  THE_APPROVED: 20, // 已审核
  HAVE_THE_GOODS: 30, // 已收货
  ABNORMAL_RECEIVING: 40, // 收货异常
  COMPLETE: 50, // 已完成
  CLOSED: 60, // 已关闭
};

// 售后类型
export const ServiceType = {
  RETURN_GOODS: 10, // 退货退款
  ONLY_REFUND: 20, // 仅退款
  ORDER_CANCEL: 30, // 支付后取消
};

export const ServiceTypeDesc = {
  [ServiceType.RETURN_GOODS]: '退货',
  [ServiceType.ONLY_REFUND]: '退款',
  [ServiceType.ORDER_CANCEL]: '支付后取消',
};

// 订单按钮类型
export const OrderButtonTypes = {
  PAY: 1, // 付款
  CANCEL: 2, // 取消订单
  CONFIRM: 3, // 确认收货
  APPLY_REFUND: 4, // 申请售后
  VIEW_REFUND: 5, // 查看退款
  COMMENT: 6, // 评价
  DELETE: 7, // 删除订单
  DELIVERY: 8, // 查看物流
  REBUY: 9, // 再次购买
  REMIND: 10, // 提醒发货
  INVITE_GROUPON: 11, //邀请好友拼团
};

// 售后服务按钮类型
export const ServiceButtonTypes = {
  REVOKE: 2, // 撤销
  FILL_TRACKING_NO: 3, // 填写运单号
  CHANGE_TRACKING_NO: 4, // 修改运单号
  VIEW_DELIVERY: 5, // 查看物流
};

// 售后状态
export const ServiceStatus = {
  PENDING_VERIFY: 100, //待审核
  VERIFIED: 110, // 已审核待寄回商品
  PENDING_DELIVERY: 120, // 等待买家寄回商品
  PENDING_RECEIPT: 130, // 已寄回商品，待收货
  RECEIVED: 140, // 已收货
  EXCEPTION: 150, // 收货异常
  REFUNDED: 160, // 已退款
  CLOSED: 170, // 已关闭
};

// 售后收货状态
export const ServiceReceiptStatus = {
  RECEIPTED: 1, // 已收到货
  NOT_RECEIPTED: 2, // 未收到货
};

// 物流节点
export const LogisticsNodeTypes = {
  SUBMITTED: 200001, // 已提交订单
  PAYMENTED: 200002, // 已付款/已下单
  SHIPPED: 200003, // 已发货
  CANCELED: 200004, // 已取消
  RECEIVED: 200005, // 已签收
  ADDRESS_CHANGED: 200006, // 已修改地址
  IN_TRANSIT: 200007, // 运输中
};

export const LogisticsIconMap = {
  [LogisticsNodeTypes.SUBMITTED]: '',
  [LogisticsNodeTypes.PAYMENTED]: 'credit_card',
  [LogisticsNodeTypes.SHIPPED]: 'deliver',
  [LogisticsNodeTypes.CANCELED]: '',
  [LogisticsNodeTypes.RECEIVED]: 'check',
  [LogisticsNodeTypes.ADDRESS_CHANGED]: '',
  [LogisticsNodeTypes.IN_TRANSIT]: 'yunshuzhong',
};

// 后端不下发按钮时，前端按订单状态兜底生成操作按钮
export const buildOrderButtons = (status) => {
  switch (status) {
    case OrderStatus.PENDING_PAYMENT: // 0 待付款
      return [
        { type: OrderButtonTypes.CANCEL, name: '取消订单', primary: false },
        { type: OrderButtonTypes.PAY, name: '去付款', primary: true },
      ];
    case OrderStatus.COMPLETE: // 3 已完成
      return [
        { type: OrderButtonTypes.COMMENT, name: '评价', primary: false },
        { type: OrderButtonTypes.DELETE, name: '删除订单', primary: false },
      ];
    case OrderStatus.PENDING_DELIVERY: // 1 待发货
      return [
        { type: OrderButtonTypes.REMIND, name: '提醒发货', primary: false },
      ];
    case OrderStatus.PENDING_RECEIPT: // 2 待收货
      return [
        { type: OrderButtonTypes.CONFIRM, name: '确认收货', primary: false },
      ];
    case OrderStatus.PAYMENT_TIMEOUT: // 4 已取消
      return [
        { type: OrderButtonTypes.DELETE, name: '删除订单', primary: false },
      ];
    default:
      return [];
  }
};
