let addressPromise = [];

/** 地址编辑Promise */
export const getAddressPromise = () => {
  let resolver;
  let rejecter;
  const nextPromise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  addressPromise.push({
    resolver,
    rejecter
  });

  return nextPromise;
};

/** 用户保存了一个地址 */
export const resolveAddress = (address, app) => {
  const allAddress = [...addressPromise];
  addressPromise = [];

  console.info('用户保存了一个地址', address);
  console.info('用户保存了一个地址,userid', app.globalData.userid);
  wx.request({
    url: app.globalData.baseUrl + '/v1/address/add',
    method: 'POST',
    data: {
      userid: app.globalData.userid,
      address: address
    },
    timeout: 60000,
    header: {
      'content-type': 'application/json'
    },
    success: (response) => {
      console.log('后端请求成功：', response.data.resData.data);
      // 通知等待中的 Promise（如列表页的 waitForNewAddress）
      allAddress.forEach(({
        resolver
      }) => resolver(address));
    },
    fail(err) {
      console.log("后端请求失败", err);
    }
  });

};


/** 获取收货地址 */
export function getAddressDetail(id = 0) {

  wx.request({
    url: app.globalData.baseUrl + '/v1/address/detail',
    method: 'GET',
    data: {
      id: id,
      userid: app.globalData.userid,
      address: address
    },
    timeout: 60000,
    header: {
      'content-type': 'application/json'
    },
    success: (response) => {
      console.log('后端请求成功：', response.data.resData.data);
      // 延迟处理
      allAddress.forEach(({
        resolver
      }) => resolver(address));

    },
    fail(err) {
      console.log("后端请求失败", err);
    }
  });
}




/** 取消编辑 */
export const rejectAddress = () => {
  const allAddress = [...addressPromise];
  addressPromise = [];

  allAddress.forEach(({
    rejecter
  }) => rejecter(new Error('cancel')));
};