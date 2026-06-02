import {
  areaData
} from '../config/index';

const addressParse = (provinceName, cityName, countryName) => {
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

module.exports = {
  addressParse,
};