import {
  getPermission
} from '../../../../utils/getPermission';
import {
  phoneRegCheck
} from '../../../../utils/util';
import Toast from 'tdesign-miniprogram/toast/index';
import {
  addressParse
} from '../../../../utils/addressParse';
import {
  resolveAddress,
  rejectAddress
} from '../../address/list/util';

Component({
  externalClasses: ['t-class'],
  properties: {
    title: {
      type: String,
    },
    navigateUrl: {
      type: String,
    },
    navigateEvent: {
      type: String,
    },
    isCustomStyle: {
      type: Boolean,
      value: false,
    },
    isDisabledBtn: {
      type: Boolean,
      value: false,
    },
    isOrderSure: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    getWxLocation() {
      if (this.properties.isDisabledBtn) return;
      getPermission({
        code: 'scope.address',
        name: '通讯地址'
      }).then(() => {
        wx.chooseAddress({
          success: async (options) => {
            const {
              provinceName,
              cityName,
              countyName,
              detailInfo,
              userName,
              telNumber
            } = options;
            console.log("options:" + options)
            console.log("options:" + provinceName)
            console.log("options:" + cityName)
            console.log("options:" + countyName)
            console.log("options:" + detailInfo)
            console.log("options:" + userName)
            console.log("options:" + telNumber)
            // if (!phoneRegCheck(telNumber)) {
            //   Toast({
            //     context: this,
            //     selector: '#t-toast',
            //     message: '请填写正确的手机号',
            //   });
            //   return;
            // }

            const target = {
              name: userName,
              phone: telNumber,
              countryName: '中国',
              countryCode: 'chn',
              detailAddress: detailInfo,
              provinceName: provinceName,
              cityName: cityName,
              districtName: countyName,
              isDefault: false,
              isOrderSure: this.properties.isOrderSure,
            };

            // 解析省市区 code，失败时降级：code 置空但基础字段仍然传递
            let provinceCode = '';
            let cityCode = '';
            let districtCode = '';
            try {
              const result = await addressParse(provinceName, cityName, countyName);
              provinceCode = result.provinceCode;
              cityCode = result.cityCode;
              districtCode = result.districtCode;
            } catch (error) {
              console.warn('地址 code 解析失败，将使用空 code 传递', error);
            }

            const params = Object.assign(target, {
              provinceCode,
              cityCode,
              districtCode,
            });
            console.log('微信地址最终参数:', params);

            if (this.properties.isOrderSure) {
              this.onHandleSubmit(params);
            } else if (this.properties.navigateUrl != '') {
              const {
                navigateEvent
              } = this.properties;
              this.triggerEvent('navigate');
              wx.navigateTo({
                url: this.properties.navigateUrl,
                success: function (res) {
                  res.eventChannel.emit(navigateEvent, params);
                },
              });
            } else {
              this.triggerEvent('change', params);
            }
          },
          fail(err) {
            console.warn('未选择微信收货地址', err);
          },
        });
      });
    },

    async queryAddress(addressId) {
      try {
        const {
          data
        } = await apis.userInfo.queryAddress({
          addressId
        });
        return data.userAddressVO;
      } catch (err) {
        console.error('查询地址错误', err);
        throw err;
      }
    },

    findPage(pageRouteUrl) {
      const currentRoutes = getCurrentPages().map((v) => v.route);
      return currentRoutes.indexOf(pageRouteUrl);
    },

    async onHandleSubmit(params) {
      try {
        const orderPageDeltaNum = this.findPage('pages/order/order-confirm/index');
        if (orderPageDeltaNum > -1) {
          wx.navigateBack({
            delta: 1
          });
          resolveAddress(params);
          return;
        }
      } catch (err) {
        rejectAddress(params);
        console.error(err);
      }
    },
  },
});