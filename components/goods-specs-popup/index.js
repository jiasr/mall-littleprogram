import Toast from 'tdesign-miniprogram/toast/index';
import { fetchGood } from '../../services/good/fetchGood';
import { addToCart } from '../../services/cart/cart';
import { ensurePhoneLogin } from '../../utils/auth';

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
  },

  properties: {
    // 兼容外部直接控制显隐（open 内部也会维护）
    show: {
      type: Boolean,
      value: false,
      observer(show) {
        if (!show) this.setData({ show: false });
      },
    },
  },

  data: {
    show: false,
    title: '',
    src: '',
    specList: [],
    skuList: [],
    buyNum: 1,
    isAllSelectedSku: false,
    limitBuyInfo: '',
    isStock: true,
    selectedSkuMap: {},
    selectSpecNameArr: [],
    // 弹窗模式：add 加购 / switch 购物车切换规格
    mode: 'add',
    confirmText: '加入购物车',
    currentSkuId: '',
    currentCartId: '',
    // 选中规格后的 SKU 库存信息
    stepperMax: 99,
    skuStockText: '',
  },

  methods: {
    // ===== 对外 API =====
    // 打开规格选择弹窗（多规格商品）
    async open(goods) {
      // 统一登录校验：手机号未绑定不弹出规格弹窗，弹提示确认后再引导登录
      const logged = await ensurePhoneLogin({ from: 'cart' });
      if (!logged) return;
      let target = goods;
      if (!goods || goods.spuId == null) return;
      // 列表数据未携带 SKU 时（如 simple-list），先拉取详情兜底
      if (!goods.skuList || goods.skuList.length === 0) {
        try {
          const detail = await fetchGood(goods.spuId);
          if (!detail || !detail.skuList || detail.skuList.length === 0) return;
          target = { ...goods, ...detail };
        } catch (err) {
          console.error('[goods-specs-popup] 加载商品SKU失败', err);
          return;
        }
      }
      const normalized = this.normalizeGoods(target);
      if (!normalized || !normalized.skuList || normalized.skuList.length === 0) return;
      this.goods = normalized;
      this.initData();
      // 无规格商品：视为已选规格，默认选中第一个 SKU
      const noSpec = !normalized.specList || normalized.specList.length === 0;
      const firstSku = noSpec ? normalized.skuList[0] || null : null;
      this.setData({
        show: true,
        mode: 'add',
        confirmText: '加入购物车',
        currentSkuId: '',
        currentCartId: '',
        title: normalized.title || '',
        src: (firstSku && firstSku.skuImage) || normalized.primaryImage || '',
        specList: normalized.specList || [],
        skuList: normalized.skuList,
        isAllSelectedSku: noSpec,
        isStock: normalized.isStock,
        limitBuyInfo: normalized.limitBuyInfo || '',
        buyNum: 1,
        stepperMax: firstSku ? Math.min(99, firstSku.quantity || 99) : 99,
        skuStockText: firstSku ? '库存 ' + (firstSku.quantity || 0) + ' 件' : '',
      });
    },

    // 打开购物车切换规格弹窗：预选当前购物车项规格，确认后触发 cartSkuChange
    openSwitch(goods, cartItem) {
      const normalized = this.normalizeGoods(goods);
      if (!normalized || !normalized.skuList || normalized.skuList.length === 0) return;
      this.goods = normalized;
      this.initData();
      const noSpec = !normalized.specList || normalized.specList.length === 0;
      const firstSku = noSpec ? normalized.skuList[0] || null : null;
      this.setData({
        show: true,
        mode: 'switch',
        confirmText: '确定',
        currentSkuId: (cartItem && cartItem.skuId) || '',
        currentCartId: (cartItem && cartItem.cartId) || '',
        title: normalized.title || '',
        src: (firstSku && firstSku.skuImage) || normalized.primaryImage || '',
        specList: normalized.specList || [],
        skuList: normalized.skuList,
        isAllSelectedSku: noSpec,
        isStock: normalized.isStock,
        limitBuyInfo: normalized.limitBuyInfo || '',
        buyNum: 1,
        stepperMax: firstSku ? Math.min(99, firstSku.quantity || 99) : 99,
        skuStockText: firstSku ? '库存 ' + (firstSku.quantity || 0) + ' 件' : '',
      });
      // 预选当前购物车项对应规格
      if (cartItem && cartItem.skuId) this._preselectSku(cartItem.skuId);
    },

    // ===== 数据归一化：兼容详情页(details)与列表页(item)商品结构 =====
    normalizeGoods(goods) {
      if (!goods || goods.spuId == null) return null;
      const {
        spuId, title, primaryImage, thumb, skuList = [], specList = [],
      } = goods;
      if (skuList.length === 0) return null;
      let finalSpecList = specList;
      let finalSkuList = skuList;
      // 列表页格式（无 specList）：从 skuList.specInfo 提取构建
      if ((!specList || specList.length === 0) && skuList[0].specInfo && skuList[0].specInfo.length) {
        const specMap = {};
        skuList.forEach((sku) => {
          (sku.specInfo || []).forEach((si) => {
            const key = si.specTitle || si.specId || '';
            if (!key) return;
            if (!specMap[key]) {
              specMap[key] = { specId: key, title: key, specValueList: [] };
            }
            const value = si.specValues || si.specValue || '';
            if (value && !specMap[key].specValueList.some((x) => x.specValue === value)) {
              specMap[key].specValueList.push({
                specValueId: `${key}_${value}`,
                specValue: value,
              });
            }
          });
        });
        finalSpecList = Object.values(specMap);
        finalSkuList = skuList.map((sku) => ({
          skuId: sku.skuId,
          quantity: sku.stock || 0,
          price: sku.price || 0,
          skuImage: sku.skuImage || sku.thumb || '',
          specInfo: (sku.specInfo || []).map((si) => {
            const key = si.specTitle || si.specId || '';
            const value = si.specValues || si.specValue || '';
            return { specId: key, specValueId: `${key}_${value}`, specValue: value };
          }),
        }));
      } else {
        // 详情页格式：quantity 归一化
        finalSkuList = skuList.map((sku) => {
          // 详情接口价格在 priceInfo 数组里（priceType=1 为销售价），列表接口才有顶层 price
          const priceInfo = sku.priceInfo || [];
          const salePrice =
            priceInfo.find((p) => p.priceType === 1) || priceInfo[0] || {};
          return {
            skuId: sku.skuId,
            quantity:
              sku.quantity != null
                ? sku.quantity
                : sku.stockInfo
                  ? sku.stockInfo.stockQuantity || 0
                  : sku.stock || 0,
            price: sku.price != null ? sku.price : salePrice.price || 0,
            skuImage: sku.skuImage || '',
            specInfo: sku.specInfo || [],
          };
        });
      }
      const hasStock = finalSkuList.some((sku) => sku.quantity > 0);
      return {
        spuId,
        title,
        primaryImage: thumb || primaryImage || '',
        specList: finalSpecList,
        skuList: finalSkuList,
        isStock: goods.isPutOnSale === 0 ? false : hasStock,
        limitBuyInfo: goods.limitInfo && goods.limitInfo[0] ? goods.limitInfo[0].text : '',
      };
    },

    // ===== 规格选择逻辑 =====
    initData() {
      const { specList, skuList } = this.data;
      specList.forEach((item) => {
        if (item.specValueList.length > 0) {
          item.specValueList.forEach((subItem) => {
            // 每个规格值展示关联总库存（无货时置灰）
            subItem.stock = this.getSpecValueStock(subItem.specValueId, skuList);
            subItem.hasStockObj = subItem.stock > 0;
          });
        }
      });
      this.setData({ specList });
      this.selectSpecObj = {};
      this.selectedSku = {};
      this.setData({ selectedSkuMap: {}, selectSpecNameArr: [] });
    },

    // 切换规格模式：按购物车项当前 SKU 预选规格
    _preselectSku(skuId) {
      const { specList, skuList } = this.data;
      const target = skuList.find((s) => s.skuId === skuId);
      if (!target) return;
      const selectSpecObj = {};
      (target.specInfo || []).forEach((si) => {
        if (si.specId) selectSpecObj[si.specId] = si.specValueId;
      });
      this.selectSpecObj = selectSpecObj;
      this.isSelectedSkuId = skuId;
      const selectSpecNameArr = [];
      specList.forEach((sp) => {
        const v = selectSpecObj[sp.specId];
        if (v) {
          const t = sp.specValueList.find((x) => x.specValueId === v);
          if (t) selectSpecNameArr.push(t.specValue);
        }
      });
      this.setData({
        selectedSkuMap: { ...selectSpecObj },
        selectSpecNameArr,
        isAllSelectedSku: this._isSpecSelectedAll(selectSpecObj, specList),
        stepperMax: Math.min(99, target.quantity || 99),
        skuStockText: '库存 ' + (target.quantity || 0) + ' 件',
        src: target.skuImage || this.data.src,
      });
    },

    // 该规格值关联 SKU 的总库存（兼容后端 spec_info 不同字段格式）
    getSpecValueStock(specValueId, skuList) {
      if (!skuList || skuList.length === 0) return 0;
      // 优先按 specValueId 匹配，不匹配时再按 specValue / specValues 值匹配
      // （如 specValueId 为 `${specId}_${specValue}` 或数字 ID 均可兼容）
      const rawId = String(specValueId || '');
      const targetValue = rawId.includes('_') ? rawId.split('_').pop() : rawId;
      return skuList.reduce((sum, item) => {
        if (!item.specInfo) return sum;
        const matched = item.specInfo.some((x) => {
          if (!x) return false;
          if (x.specValueId && String(x.specValueId) === rawId) return true;
          const value = x.specValue || x.specValues || '';
          return value && (String(value) === targetValue || String(value) === rawId);
        });
        return matched ? sum + (item.quantity || 0) : sum;
      }, 0);
    },

    _isSpecSelectedAll(selectSpecObj, specList) {
      if (!selectSpecObj || !specList || specList.length === 0) return false;
      return specList.every((item) => {
        const specValueId = selectSpecObj[item.specId];
        return specValueId !== '' && specValueId !== undefined;
      });
    },

    getSkuItem(skuList, selectSpecObj) {
      const keys = Object.keys(selectSpecObj);
      const target = skuList.find((item) => {
        const matchRes = item.specInfo.filter((x) =>
          keys.map((k) => selectSpecObj[k]).indexOf(x.specValueId) > -1);
        return matchRes.length === keys.length;
      });
      return target ? target.skuId : null;
    },

    chooseSpecValueId(specId, specValueId) {
      const { specList, skuList } = this.data;
      const selectSpecObj = { ...(this.selectSpecObj || {}) };
      selectSpecObj[specId] = specValueId;
      this.selectSpecObj = selectSpecObj;
      const selectedSkuMap = { ...selectSpecObj };
      // 生成选中的规格名展示
      const selectSpecNameArr = [];
      specList.forEach((sp) => {
        const v = selectSpecObj[sp.specId];
        if (v) {
          const target = sp.specValueList.find((x) => x.specValueId === v);
          if (target) selectSpecNameArr.push(target.specValue);
        }
      });
      const obj = { selectedSkuMap, selectSpecNameArr };
      if (this._isSpecSelectedAll(selectSpecObj, specList)) {
        const curSkuId = this.getSkuItem(skuList, selectSpecObj);
        obj.isAllSelectedSku = !!curSkuId;
        this.isSelectedSkuId = curSkuId;
        // 选中完整规格：刷新该 SKU 的库存/图片/价格，数量上限跟随库存
        const curSku = curSkuId ? skuList.find((s) => s.skuId === curSkuId) : null;
        obj.stepperMax = curSku ? Math.min(99, curSku.quantity || 99) : 99;
        obj.skuStockText = curSku ? '库存 ' + (curSku.quantity || 0) + ' 件' : '';
        if (curSku && curSku.skuImage) obj.src = curSku.skuImage;
      } else {
        obj.isAllSelectedSku = false;
        obj.stepperMax = 99;
        obj.skuStockText = '';
      }
      this.setData(obj);
    },

    toChooseItem(e) {
      const { specValueId, specId } = e.currentTarget.dataset;
      this.chooseSpecValueId(specId, specValueId);
      const { specList, skuList } = this.data;
      const selectSpecObj = this.selectSpecObj;
      const isAllSelectedSku = this._isSpecSelectedAll(selectSpecObj, specList);
      let matchSku = null;
      if (isAllSelectedSku) {
        const curSkuId = this.getSkuItem(skuList, selectSpecObj);
        matchSku = skuList.find((item) => item.skuId === curSkuId) || null;
      }
      this.triggerEvent('change', {
        specList,
        selectedSku: selectSpecObj,
        isAllSelectedSku,
        sku: matchSku,
      });
    },

    // ===== 数量变化 =====
    handleBuyNumChange(e) {
      this.setData({ buyNum: e.detail.value });
    },

    // ===== 加购 / 切换规格 =====
    handleAddCart() {
      const { isStock, mode } = this.data;
      if (!isStock) return;
      if (mode === 'switch') {
        this.doSwitchCart();
      } else {
        this.doAddCart(null, null);
      }
    },

    // 切换规格确认：已选规格无变化直接关闭；有变化触发 cartSkuChange 交页面处理
    doSwitchCart() {
      const { specList, skuList, currentSkuId, currentCartId } = this.data;
      const sel = this.selectSpecObj || {};
      if (specList.length > 0 && !this._isSpecSelectedAll(sel, specList)) {
        this.showToast('请选择完整规格');
        return;
      }
      const newSkuId =
        specList.length === 0
          ? skuList[0] ? skuList[0].skuId : ''
          : this.getSkuItem(skuList, sel) || '';
      if (!newSkuId) {
        this.showToast('该规格无货或不存在');
        return;
      }
      if (newSkuId === currentSkuId) {
        // 规格未变化：直接关闭
        this.setData({ show: false });
        return;
      }
      const spuId = this.goods ? this.goods.spuId : '';
      this.setData({ show: false });
      this.triggerEvent('cartSkuChange', {
        cartId: currentCartId,
        spuId,
        oldSkuId: currentSkuId,
        newSkuId,
      });
    },

    // 核心加购：弹窗内按当前选中规格加购，或直接指定 skuId 快捷加购
    async doAddCart(skuId, quantity) {
      const goods = this.goods;
      if (!goods || goods.spuId == null) return;
      const { isAllSelectedSku, specList, skuList, buyNum } = this.data;
      let finalSkuId = skuId;
      const finalQuantity = quantity || buyNum || 1;
      if (finalSkuId == null) {
        if (specList.length === 0) {
          finalSkuId = skuList.length ? skuList[0].skuId : null;
        } else {
          if (!isAllSelectedSku) {
            this.showToast('请选择规格');
            return;
          }
          finalSkuId = this.getSkuItem(skuList, this.selectSpecObj || {});
        }
      }
      if (finalSkuId == null) {
        this.showToast('规格匹配失败');
        return;
      }

      // 统一登录校验（二次兜底）：未绑定手机号弹提示，确认后再引导登录
      const logged = await ensurePhoneLogin({ from: 'cart' });
      if (!logged) {
        this.setData({ show: false });
        return;
      }

      try {
        const app = getApp();
        const res = await addToCart(goods.spuId, finalSkuId, finalQuantity);
        if (res && res.success) {
          // 全局购物车数量直接自增（徽标实时变动）
          app.addCartCount(finalQuantity);
          this.setData({ show: false });
          this.showCartGuide();
        } else {
          this.showToast((res && res.message) || '加购失败');
        }
      } catch (err) {
        this.showToast('加购失败');
      }
    },

    // 加购成功去向引导：去购物车 / 继续逛
    showCartGuide() {
      wx.showModal({
        title: '已加入购物车',
        content: '',
        confirmText: '去购物车',
        cancelText: '继续逛',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/cart/index' });
          }
        },
      });
    },

    showToast(message) {
      Toast({
        context: this,
        selector: '#t-toast',
        message,
        duration: 1200,
      });
    },

    handlePopupHide() {
      this.setData({ show: false });
      this.triggerEvent('closeSpecsPopup');
    },
  },
});
