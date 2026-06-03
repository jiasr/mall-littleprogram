/* eslint-disable no-param-reassign */

import Toast from 'tdesign-miniprogram/toast/index';
import {
  resolveAddress,
  rejectAddress
} from './util';
import {
  getAddressPromise
} from '../edit/util';

const app = getApp();
const userid = app.globalData.userid;
// 获取 app 实例
Page({
  data: {
    addressList: [],
    deleteID: '',
    showDeleteConfirm: false,
    isOrderSure: false,
  },

  /** 选择模式 */
  selectMode: false,
  /** 是否已经选择地址，不置为true的话页面离开时会触发取消选择行为 */
  hasSelect: false,

  onLoad(query) {
    const {
      selectMode = '', isOrderSure = '', id = ''
    } = query;
    this.setData({
      isOrderSure: !!isOrderSure,
      id,
    });
    this.selectMode = !!selectMode;
  },

  onShow() {
    //自定义tabbar加载，位置位于custom-tab-bar目录
    this.getAddressList();
  },

  onUnload() {
    if (this.selectMode && !this.hasSelect) {
      rejectAddress();
    }
  },

  getAddressList() {
    const {
      id
    } = this.data;
    console.log("开始获取用户地址")
    wx.request({
      url: app.globalData.baseUrl + '/v1/address/list',
      method: 'GET',
      data: {
        userid: app.globalData.userid
      },
      timeout: 60000,
      header: {
        'content-type': 'application/json'
      },
      success: (response) => {
        console.log('后端请求成功：', response.data.resData.data);
        // 延迟处理

        const addressArray = response.data.resData.data;
        // 使用 map 转换数组
        const convertedArray = addressArray.map((address) => ({
          ...address,
          phoneNumber: address.mobile,
          address: `${address.province}${address.city}${address.district}${address.detail}`,
          tag: "moren",
        }));

        console.log("set data：" + convertedArray)
        this.setData({
          addressList: convertedArray
        });

      },
      fail(err) {
        console.log("后端请求失败", err);
      }
    });

  },

  getWXAddressHandle() {
    console.log("choose wx location")
    wx.chooseAddress({
      success: (res) => {
        if (res.errMsg.indexOf('ok') === -1) {
          Toast({
            context: this,
            selector: '#t-toast',
            message: res.errMsg,
            icon: '',
            duration: 1000,
          });
          return;
        }
        Toast({
          context: this,
          selector: '#t-toast',
          message: '添加成功',
          icon: '',
          duration: 1000,
        });
        const {
          length: len
        } = this.data.addressList;
        this.setData({
          [`addressList[${len}]`]: {
            name: res.userName,
            phoneNumber: res.telNumber,
            address: `${res.provinceName}${res.cityName}${res.countryName}${res.detailInfo}`,
            isDefault: 0,
            tag: '微信地址',
            id: len,
          },
        });
      },
    });
  },

  confirmDeleteHandle({
    detail
  }) {
    const {
      id
    } = detail || {};
    if (id !== undefined) {
      this.setData({
        deleteID: id,
        showDeleteConfirm: true
      });
      Toast({
        context: this,
        selector: '#t-toast',
        message: '地址删除成功',
        theme: 'success',
        duration: 1000,
      });
    } else {
      Toast({
        context: this,
        selector: '#t-toast',
        message: '需要组件库发新版才能拿到地址ID',
        icon: '',
        duration: 1000,
      });
    }
  },

  deleteAddressHandle(e) {
    console.group(e)
    const id = e.currentTarget.dataset;
    console.group(e.currentTarget.dataset)
    wx.request({
      url: app.globalData.baseUrl + '/v1/address/delete',
      method: 'POST',
      data: {
        userid: app.globalData.userid,
        id: id
      },
      timeout: 60000,
      header: {
        'content-type': 'application/json'
      },
      success: (response) => {
        console.log('后端请求成功：', response.data.resData.data);
        this.getAddressList();
      },
      fail(err) {
        console.log("后端请求失败", err);
      }
    });



  },

  editAddressHandle({
    detail
  }) {
    this.waitForNewAddress();

    const {
      id
    } = detail || {};
    wx.navigateTo({
      url: `/pages/usercenter/address/edit/index?id=${id}`
    });
  },

  selectHandle({
    detail
  }) {
    if (this.selectMode) {
      this.hasSelect = true;
      resolveAddress(detail);
      wx.navigateBack({
        delta: 1
      });
    } else {
      this.editAddressHandle({
        detail
      });
    }
  },

  createHandle() {
    this.waitForNewAddress();
    wx.navigateTo({
      url: '/pages/usercenter/address/edit/index'
    });
  },

  waitForNewAddress() {
    console.log("waitForNewAddress")
    getAddressPromise()
      .then((newAddress) => {
        let addressList = [...this.data.addressList];

        newAddress.phoneNumber = newAddress.phone;
        newAddress.address = `${newAddress.provinceName}${newAddress.cityName}${newAddress.districtName}${newAddress.detailAddress}`;
        newAddress.tag = newAddress.addressTag;

        if (!newAddress.addressId) {
          newAddress.id = `${addressList.length}`;
          newAddress.addressId = `${addressList.length}`;

          if (newAddress.isDefault === 1) {
            addressList = addressList.map((address) => {
              address.isDefault = 0;

              return address;
            });
          } else {
            newAddress.isDefault = 0;
          }

          addressList.push(newAddress);
        } else {
          addressList = addressList.map((address) => {
            if (address.addressId === newAddress.addressId) {
              return newAddress;
            }
            return address;
          });
        }

        addressList.sort((prevAddress, nextAddress) => {
          if (prevAddress.isDefault && !nextAddress.isDefault) {
            return -1;
          }
          if (!prevAddress.isDefault && nextAddress.isDefault) {
            return 1;
          }
          return 0;
        });

        this.setData({
          addressList: addressList,
        });
      })
      .catch((e) => {
        if (e.message !== 'cancel') {
          Toast({
            context: this,
            selector: '#t-toast',
            message: '地址编辑发生错误',
            icon: '',
            duration: 1000,
          });
        }
      });
  },
});