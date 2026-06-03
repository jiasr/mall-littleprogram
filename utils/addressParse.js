import {
  areaData
} from '../config/index';

/**
 * 从 wx.chooseLocation 返回的完整地址字符串中，提取省/市/区名称和 code
 * 例如: "广东省深圳市南山区科技园科苑路" → { provinceName, provinceCode, cityName, cityCode, districtName, districtCode }
 */
export const parseAddressFromString = (fullAddress) => {
  console.log(fullAddress)
  return new Promise((resolve, reject) => {
    try {
      // 1. 匹配省份（取最长匹配，避免"宁夏"误匹配"宁夏回族自治区"）
      const province = areaData.find((v) => fullAddress.startsWith(v.label));
      if (!province) return reject('未匹配到省份');
      const provinceName = province.label;
      const provinceCode = province.value;
      let remaining = fullAddress.substring(provinceName.length);

      // 2. 匹配城市
      const city = province.children.find((v) => remaining.startsWith(v.label));
      if (!city) return reject('未匹配到城市');
      const cityName = city.label;
      const cityCode = city.value;
      remaining = remaining.substring(cityName.length);

      // 3. 匹配区县
      const district = city.children.find((v) => remaining.startsWith(v.label));
      if (!district) return reject('未匹配到区县');
      const districtName = district.label;
      const districtCode = district.value;
      console.log(provinceCode)
      console.log(cityCode)
      console.log(districtCode)
      console.log(provinceName)
      console.log(cityName)
      console.log(districtName)
      resolve({
        provinceCode,
        cityCode,
        districtCode,
        provinceName,
        cityName,
        districtName
      });
    } catch (error) {
      reject('地址解析失败');
    }
  });
};

/**
 * 从 wx.chooseAddress 返回的单独省/市/区名中匹配对应的 code
 * 注意：微信返回的名称可能和 areaData 中的 label 不完全一致（如"北京市" vs "北京"），
 * 优先精确匹配，失败时尝试模糊匹配（包含关系）
 */
export const addressParse = (provinceName, cityName, countryName) => {
  console.log('addressParse 输入:', provinceName, cityName, countryName);
  return new Promise((resolve, reject) => {
    try {
      // 省份匹配：先精确匹配，再模糊匹配
      let province = areaData.find((v) => v.label === provinceName);
      if (!province) {
        province = areaData.find((v) => v.label.includes(provinceName) || provinceName.includes(v.label));
      }
      if (!province) {
        console.error('未匹配到省份:', provinceName);
        return reject(new Error(`未匹配到省份: ${provinceName}`));
      }
      const provinceCode = province.value;

      // 城市匹配
      let city = province.children.find((v) => v.label === cityName);
      if (!city) {
        city = province.children.find((v) => v.label.includes(cityName) || cityName.includes(v.label));
      }
      if (!city) {
        console.error('未匹配到城市:', cityName, '省份:', provinceName);
        return reject(new Error(`未匹配到城市: ${cityName}`));
      }
      const cityCode = city.value;

      // 区县匹配
      let district = city.children.find((v) => v.label === countryName);
      if (!district) {
        district = city.children.find((v) => v.label.includes(countryName) || countryName.includes(v.label));
      }
      if (!district) {
        console.error('未匹配到区县:', countryName, '城市:', cityName);
        return reject(new Error(`未匹配到区县: ${countryName}`));
      }
      const districtCode = district.value;

      resolve({ provinceCode, cityCode, districtCode });
    } catch (error) {
      reject(error);
    }
  });
};