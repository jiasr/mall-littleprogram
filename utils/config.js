/** 运行环境与接口域名配置
 * * 自动判断规则： *   - develop（开发者工具 / 真机预览-开发版）→ DEV_BASE_URL 本地后端，方便联调
 *   - trial（体验版） / release（正式版）→ PROD_BASE_URL 线上域名
 *
 * 如需临时连指定后端（如真机调试连电脑局域网 IP），在开发者工具 Console 执行：
 *   wx.setStorageSync('baseUrlOverride', 'http://192.168.x.x:8560')
 * 恢复自动判断：wx.removeStorageSync('baseUrlOverride')
 */
export const DEV_BASE_URL = 'http://192.168.1.6:8560';
//export const DEV_BASE_URL = 'http://localhost:8560';
//export const DEV_BASE_URL = 'https://xianguo.online';
export const PROD_BASE_URL = 'https://xianguo.online';

export function getEnvBaseUrl() {
  try {
    // 手动覆盖优先（临时指定后端，避免改动代码）
    const override = wx.getStorageSync('baseUrlOverride');
    if (override) {
      console.log(`[config] baseUrl 手动覆盖: ${override}`);
      return override;
    }
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram && accountInfo.miniProgram.envVersion;
    // 双保险：开发者工具内 envVersion 固定为 develop，同时检测 devtools 平台
    const devtools = wx.getDeviceInfo ? wx.getDeviceInfo().platform === 'devtools' :
      wx.getSystemInfoSync().platform === 'devtools';
    if (envVersion === 'develop' || devtools) {
      console.log(`[config] 开发环境(${envVersion || 'devtools'}) → ${DEV_BASE_URL}`);
      return DEV_BASE_URL;
    }
  } catch (e) {
    // 基础库过低或异常场景，回退线上域名
  }
  console.log(`[config] 正式环境 → ${PROD_BASE_URL}`);
  return PROD_BASE_URL;
}