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
 */
export const addressParse = (provinceName, cityName, countryName) => {
  console.log(provinceName)
  console.log(cityName)
  console.log(countryName)
  return new Promise((resolve, reject) => {
    try {

      const province = areaData.find((v) => v.label === provinceName);
      console.log(province)
      const {
        value: provinceCode
      } = province;
      console.log(province)
      const city = province.children.find((v) => v.label === cityName);
      console.log(city)
      const {
        value: cityCode
      } = city;
      console.log(city)
      const country = city.children.find((v) => v.label === countryName);
      console.log(country)
      const {
        value: districtCode
      } = country;
      console.log(country)
      resolve({
        provinceCode,
        cityCode,
        districtCode,
      });
    } catch (error) {
      reject('地址解析失败');
    }
  });
};