import Toast from 'tdesign-miniprogram/toast/index';
import {
  areaData
} from '../../../../config/index';
import {
  resolveAddress,
  rejectAddress
} from './util';
import {
  addressParse,
  parseAddressFromString
} from '../../../../utils/addressParse'

const innerPhoneReg = '^1(?:3\\d|4[4-9]|5[0-35-9]|6[67]|7[0-8]|8\\d|9\\d)\\d{8}$';
const innerNameReg = '^[a-zA-Z\\d\\u4e00-\\u9fa5]+$';
const labelsOptions = [{
    id: 0,
    name: '家'
  },
  {
    id: 1,
    name: '公司'
  },
];

const app = getApp();
const userid = app.globalData.userid;

Page({
  options: {
    multipleSlots: true,
  },
  externalClasses: ['theme-wrapper-class'],
  data: {
    locationState: {
      addressTag: '',
      cityCode: '',
      cityName: '',
      detailAddress: '',
      districtCode: '',
      districtName: '',
      isDefault: false,
      name: '',
      phone: '',
      provinceCode: '',
      provinceName: '',
    },
    areaData: areaData,
    labels: labelsOptions,
    areaPickerVisible: false,
    submitActive: false,
    visible: false,
    labelValue: '',
    columns: 3,
  },
  privateData: {
    verifyTips: '',
  },
  onLoad(options) {
    console.log(options)
    const {
      id
    } = options;

    // 注册 eventChannel 监听，接收从微信导入的地址数据
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.on('onWeixinAddressPassed', (weixinAddress) => {
        console.log('收到微信地址数据:', weixinAddress);
        this.getWeixinAddress({
          detail: weixinAddress
        });
      });
    }

    this.init(id);
  },

  onUnload() {
    if (!this.hasSava) {
      rejectAddress();
    }
  },

  hasSava: false,
  init(id) {
    //
    if (id) {
      console.log("编辑address:id=" + id)
      this.getAddressDetail(id);
    } else {
      console.log("新建address")
    }
  },

  //编辑地址进入，请求服务器填充地址
  getAddressDetail(id) {
    console.log("开始获取用户地址详情")
    wx.request({
      url: app.globalData.baseUrl + '/v1/address/detail',
      method: 'GET',
      data: {
        userid: app.globalData.userid,
        id: id
      },
      timeout: 60000,
      header: {
        'content-type': 'application/json'
      },
      success: (response) => {
        console.log('后端请求成功：', response.data.resData);
        const convertdata = {
          id: response.data.resData.id,
          name: response.data.resData.name,
          phone: response.data.resData.mobile,
          labelIndex: null,
          addressId: response.data.resData.id,
          addressTag: '',
          cityCode: response.data.resData.citycode,
          cityName: response.data.resData.city,
          countryCode: '',
          countryName: '',
          detailAddress: response.data.resData.detail,
          districtCode: response.data.resData.districtcode,
          districtName: response.data.resData.district,
          isDefault: false,
          provinceCode: response.data.resData.provincecode,
          provinceName: response.data.resData.province,
          isEdit: false,
          isOrderDetail: false,
          isOrderSure: false,
        }
        // 延迟处理
        this.setData({
          locationState: convertdata
        }, () => {
          const {
            isLegal,
            tips
          } = this.onVerifyInputLegal();
          console.log("验证结果isLegal" + isLegal)
          console.log("验证结果tips" + tips)
          this.setData({
            submitActive: isLegal,
          });
          this.privateData.verifyTips = tips;
        })
      },
      fail(err) {
        console.log("后端请求失败", err);
      }
    });

    // getAddressDetail(id).then((detail) => {
    //   this.setData({
    //     locationState: detail
    //   }, () => {
    //     const {
    //       isLegal,
    //       tips
    //     } = this.onVerifyInputLegal();
    //     this.setData({
    //       submitActive: isLegal,
    //     });
    //     this.privateData.verifyTips = tips;
    //   });
    // });
  },

  onInputValue(e) {
    const {
      item
    } = e.currentTarget.dataset;
    if (item === 'address') {
      const {
        selectedOptions = []
      } = e.detail;
      this.setData({
          'locationState.provinceCode': selectedOptions[0].value,
          'locationState.provinceName': selectedOptions[0].label,
          'locationState.cityName': selectedOptions[1].label,
          'locationState.cityCode': selectedOptions[1].value,
          'locationState.districtCode': selectedOptions[2].value,
          'locationState.districtName': selectedOptions[2].label,
          areaPickerVisible: false,
        },
        () => {
          const {
            isLegal,
            tips
          } = this.onVerifyInputLegal();
          this.setData({
            submitActive: isLegal,
          });
          this.privateData.verifyTips = tips;
        },
      );
    } else {
      const {
        value = ''
      } = e.detail;
      this.setData({
          [`locationState.${item}`]: value,
        },
        () => {
          const {
            isLegal,
            tips
          } = this.onVerifyInputLegal();
          this.setData({
            submitActive: isLegal,
          });
          this.privateData.verifyTips = tips;
        },
      );
    }
  },

  onPickArea() {
    console.log("onPickArea")
    this.setData({
      areaPickerVisible: true
    });
  },

  onPickLabels(e) {
    const {
      item
    } = e.currentTarget.dataset;
    const {
      locationState: {
        labelIndex = undefined
      },
      labels = [],
    } = this.data;
    let payload = {
      labelIndex: item,
      addressTag: labels[item].name,
    };
    if (item === labelIndex) {
      payload = {
        labelIndex: null,
        addressTag: ''
      };
    }
    this.setData({
      'locationState.labelIndex': payload.labelIndex,
    });
    this.triggerEvent('triggerUpdateValue', payload);
  },

  addLabels() {
    this.setData({
      visible: true,
    });
  },

  confirmHandle() {
    const {
      labels,
      labelValue
    } = this.data;
    this.setData({
      visible: false,
      labels: [...labels, {
        id: labels[labels.length - 1].id + 1,
        name: labelValue
      }],
      labelValue: '',
    });
  },

  cancelHandle() {
    this.setData({
      visible: false,
      labelValue: '',
    });
  },

  onCheckDefaultAddress({
    detail
  }) {
    const {
      value
    } = detail;
    this.setData({
      'locationState.isDefault': value,
    });
  },
  //验证输入合法性
  onVerifyInputLegal() {
    console.log("验证输入合法性")
    const {
      name,
      phone,
      detailAddress,
      districtName
    } = this.data.locationState;
    const prefixPhoneReg = String(this.properties.phoneReg || innerPhoneReg);
    const prefixNameReg = String(this.properties.nameReg || innerNameReg);
    const nameRegExp = new RegExp(prefixNameReg);
    const phoneRegExp = new RegExp(prefixPhoneReg);

    if (!name || !name.trim()) {
      console.log("请填写收货人")
      return {
        isLegal: false,
        tips: '请填写收货人',
      };
    }
    if (!nameRegExp.test(name)) {
      console.log("收货人仅支持输入中文、英文（区分大小写）、数字=='^[a-zA-Z\\d\\u4e00-\\u9fa5]+$';")
      return {
        isLegal: false,
        tips: '收货人仅支持输入中文、英文（区分大小写）、数字',
      };
    }
    if (!phone || !phone.trim()) {
      console.log("请填写手机号")
      return {
        isLegal: false,
        tips: '请填写手机号',
      };
    }
    if (!phoneRegExp.test(phone)) {
      console.log("请填写正确的手机号^1(?:3\\d|4[4-9]|5[0-35-9]|6[67]|7[0-8]|8\\d|9\\d)\\d{8}$")
      return {
        isLegal: false,
        tips: '请填写正确的手机号',
      };
    }
    if (!districtName || !districtName.trim()) {
      console.log("请选择省市区信息")
      return {
        isLegal: false,
        tips: '请选择省市区信息',
      };
    }
    if (!detailAddress || !detailAddress.trim()) {
      console.log("请完善详细地址")
      return {
        isLegal: false,
        tips: '请完善详细地址',
      };
    }
    if (detailAddress && detailAddress.trim().length > 50) {
      console.log("详细地址不能超过50个字符")
      return {
        isLegal: false,
        tips: '详细地址不能超过50个字符',
      };
    }
    return {
      isLegal: true,
      tips: '添加成功',
    };
  },

  builtInSearch({
    code,
    name
  }) {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting[code] === false) {
            wx.showModal({
              title: `获取${name}失败`,
              content: `获取${name}失败，请在【右上角】-小程序【设置】项中，将【${name}】开启。`,
              confirmText: '去设置',
              confirmColor: '#FA550F',
              cancelColor: '取消',
              success(res) {
                if (res.confirm) {
                  wx.openSetting({
                    success(settinRes) {
                      if (settinRes.authSetting[code] === true) {
                        resolve();
                      } else {
                        console.warn('用户未打开权限', name, code);
                        reject();
                      }
                    },
                  });
                } else {
                  reject();
                }
              },
              fail() {
                reject();
              },
            });
          } else {
            resolve();
          }
        },
        fail() {
          reject();
        },
      });
    });
  },

  //点击选位置
  onSearchAddress() {
    console.log("get wx address onSearchAddress")
    this.builtInSearch({
      code: 'scope.userLocation',
      name: '地址位置'
    }).then(() => {
      wx.chooseLocation({
        success: (res) => {
          console.log("get wx address onSearchAddress：success")
          console.log(res)
          if (res.name) {
            console.log("------------")
            parseAddressFromString(res.address).then(({
              provinceCode,
              cityCode,
              districtCode,
              provinceName,
              cityName,
              districtName
            }) => {
              // 剩余部分作为详细地址
              const detailPrefix = provinceName + cityName + districtName;
              const detailAddress = res.address.substring(detailPrefix.length).trim();
              this.setData({
                'locationState.provinceName': provinceName,
                'locationState.provinceCode': provinceCode,
                'locationState.cityName': cityName,
                'locationState.cityCode': cityCode,
                'locationState.districtName': districtName,
                'locationState.districtCode': districtCode,
                'locationState.detailAddress': detailAddress,
                'locationState.latitude': res.latitude,
                'locationState.longitude': res.longitude,
              });
            }).catch((err) => {
              console.warn('地址解析失败', err);
              Toast({
                context: this,
                selector: '#t-toast',
                message: '地址解析失败，请稍后再试',
                icon: '',
                duration: 2000,
              });
            });
            console.log("------------")
          } else {
            Toast({
              context: this,
              selector: '#t-toast',
              message: '地点为空，请重新选择',
              icon: '',
              duration: 2000,
            });
          }
        },
        fail: (res) => {
          console.log("get wx address fail")
          console.log(res)
          console.warn(`wx.chooseLocation fail: ${JSON.stringify(res)}`);
          if (res.errMsg !== 'chooseLocation:fail cancel') {
            Toast({
              context: this,
              selector: '#t-toast',
              message: '地点错误，请重新选择',
              icon: '',
              duration: 2000,
            });
          } else {
            Toast({
              context: this,
              selector: '#t-toast',
              message: '未选择地址',
              icon: '',
              duration: 2000,
            });
          }
        },
      });
    });
  },

  //接收到微信地址后处理
  getWeixinAddress(e) {
    console.log("接收到微信地址后处理getWeixinAddress")
    const {
      locationState
    } = this.data;
    console.log('eventChannel 传入数据:', e)
    const weixinAddress = e.detail;
    console.log('接收到微信地址后处理getWeixinAddress', weixinAddress);
    const convertdata = {
      id: "",
      name: weixinAddress.name,
      phone: weixinAddress.phone,
      cityCode: weixinAddress.cityCode,
      cityName: weixinAddress.cityName,
      countryCode: weixinAddress.countryCode,
      countryName: weixinAddress.countryName,
      districtCode: weixinAddress.districtCode,
      districtName: weixinAddress.districtName,
      detailAddress: weixinAddress.detailAddress,
      provinceCode: weixinAddress.provinceCode,
      provinceName: weixinAddress.provinceName,
      isDefault: false,
    }
    // 延迟处理
    this.setData({
      locationState: convertdata
    }, () => {
      const {
        isLegal,
        tips
      } = this.onVerifyInputLegal();
      console.log("验证结果isLegal" + isLegal)
      console.log("验证结果tips" + tips)
      this.setData({
        submitActive: isLegal,
      });
      this.privateData.verifyTips = tips;
    })

  },

  //提交地址
  formSubmit() {
    const {
      submitActive
    } = this.data;
    if (!submitActive) {
      Toast({
        context: this,
        selector: '#t-toast',
        message: this.privateData.verifyTips,
        icon: '',
        duration: 1000,
      });
      return;
    }
    const {
      locationState
    } = this.data;

    this.hasSava = true;

    resolveAddress({
      id: locationState.addressId,
      phone: locationState.phone,
      name: locationState.name,
      countryName: locationState.countryName,
      countryCode: locationState.countryCode,
      provinceName: locationState.provinceName,
      provinceCode: locationState.provinceCode,
      cityName: locationState.cityName,
      cityCode: locationState.cityCode,
      districtName: locationState.districtName,
      districtCode: locationState.districtCode,
      detailAddress: locationState.detailAddress,
      isDefault: locationState.isDefault === 1 ? 1 : 0,
      addressTag: locationState.addressTag,
      latitude: locationState.latitude,
      longitude: locationState.longitude,
      storeId: null,
    }, app);
    console.log("处理完成")
    wx.navigateBack({
      delta: 1
    });
  },


});