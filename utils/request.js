/** 统一请求封装
 *
 * 后端响应格式：
 *   { errCode, errMessage, exceptionMsg, flag, resData }
 *
 * 本模块自动解包，成功返回 resData，失败抛异常。
 */
function request(method, path, data = {}) {
  const app = getApp();
  const baseUrl = app ? app.globalData.baseUrl : 'http://localhost:8560';
  const token = app ? app.globalData.token || '' : '';
  const fullUrl = baseUrl + path;

  console.log(`[request] ${method} ${fullUrl}`, JSON.stringify(data));

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + path,
      method,
      data,
      timeout: 30000,
      header: {
        'content-type': 'application/json',
        ...(token ? { token } : {}),
      },
      success(res) {
        const resp = res.data;
        // 后端统一响应格式: { flag, resData, errCode, errMessage }
        if (resp && resp.flag !== undefined) {
          if (resp.flag === true) {
            resolve(resp.resData);
          } else {
            const msg = resp.exceptionMsg || resp.errMessage || '请求失败';
            console.error(`[request] ${method} ${path} failed:`, msg);
            reject({ code: resp.errCode, message: msg });
          }
        } else {
          // 非标准格式直接返回
          resolve(resp);
        }
      },
      fail(err) {
        console.error(`[request] ${method} ${path} network error:`, err);
        reject({ code: -1, message: '网络异常，请稍后重试' });
      },
    });
  });
}

/** GET 请求 */
export function get(path, data = {}) {
  return request('GET', path, data);
}

/** POST 请求 */
export function post(path, data = {}) {
  return request('POST', path, data);
}

/** PUT 请求 */
export function put(path, data = {}) {
  return request('PUT', path, data);
}

/** DELETE 请求 */
export function del(path, data = {}) {
  return request('DELETE', path, data);
}
