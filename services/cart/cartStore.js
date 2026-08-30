/**
 * 购物车全局状态管理（单例）
 *
 * 三层缓存：
 *  Layer 0 页面 data        —— 由页面自行维护，操作即时生效
 *  Layer 1 wx.storage       —— 本 store 负责：服务端快照 cart.cache / 变更队列 cart.pending / 版本号 cart.version
 *  Layer 2 服务端           —— 权威数据源
 *
 * 变更链路：页面操作 → enqueue()（写 pending 落盘，同商品去重以最后一次为准）
 *          → 800ms 防抖 flush() → 批量 sync 接口（带版本号乐观锁）
 *          → 成功清队列并更新版本；网络/业务失败回填待重试；版本冲突丢弃本地变更并提示（以后端为准）
 *
 * 兜底：App 启动 / 购物车页 onShow 检查 pending 非空自动补提交，进程被杀不丢变更
 */
import { syncCart } from './cart';

const PENDING_KEY = 'cart.pending';
const VERSION_KEY = 'cart.version';
const CACHE_KEY = 'cart.cache';

/** 防抖延迟：连续操作停止 800ms 后才统一提交后端 */
const FLUSH_DELAY = 800;

const _state = {
  userid: '',
  version: 0,
  cache: null, // { validItems, invalidItems, updatedAt }
};

let _memPending = null; // pending 的读缓存（storage 仅作持久化）
let _flushTimer = null;
let _flushing = false;

// ====== storage 读写 ======

function _safeGet(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    return null;
  }
}

function _safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    // storage 满等异常不阻塞业务
  }
}

function _loadPending() {
  if (_memPending) return _memPending;
  _memPending = _safeGet(PENDING_KEY) || {};
  return _memPending;
}

function _persistPending() {
  _safeSet(PENDING_KEY, _memPending || {});
}

function _loadVersion() {
  _state.version = _safeGet(VERSION_KEY) || 0;
}

function _persistVersion(version) {
  _state.version = version || 0;
  _safeSet(VERSION_KEY, _state.version);
}

// ====== 初始化 ======

/** 登录态变化时初始化（切换用户重置缓存） */
export function init(userid) {
  if (!userid) return;
  if (userid !== _state.userid) {
    _state.userid = userid;
    _state.cache = null;
    _memPending = null;
    _loadVersion();
  }
}

// ====== 变更队列 ======

/** 是否有未同步的本地变更 */
export function hasPending() {
  return Object.keys(_loadPending()).length > 0;
}

/**
 * 入队一个变更（改数量/勾选/删除/换规格），落盘后调度防抖批量提交
 * change: { spuId, skuId, cartId?, quantity?, isSelected?, deleted?, skuIdChange? }
 */
export function enqueue(change) {
  const pending = _loadPending();
  const key = (change.spuId || '') + '_' + (change.skuId || '');
  const prev = pending[key] || {};
  const merged = Object.assign({}, prev, change);
  // 同 SKU 重新加购（带数量/勾选/换规格）时撤销之前的删除标记，避免误删
  if (prev.deleted && (change.quantity != null || change.isSelected != null || change.skuIdChange)) {
    delete merged.deleted;
  }
  pending[key] = merged;
  _persistPending();
  scheduleFlush();
}

/** 防抖调度：停止操作 FLUSH_DELAY 后才真正提交 */
export function scheduleFlush() {
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flush();
  }, FLUSH_DELAY);
}

/**
 * 批量提交本地全部变更（同步/网络失败自动回填，版本冲突丢弃本地变更）
 * @returns {Promise<{synced:boolean, changed:boolean, conflict?:boolean, error?:string}>}
 */
export function flush() {
  return new Promise(resolve => {
    if (_flushing) return resolve({ synced: false, changed: false, busy: true });
    const pending = _loadPending();
    const keys = Object.keys(pending);
    if (keys.length === 0) return resolve({ synced: true, changed: false });
    if (_flushTimer) {
      clearTimeout(_flushTimer);
      _flushTimer = null;
    }

    _flushing = true;
    const items = keys.map(k => pending[k]);
    // 先清空内存队列：成功则彻底清空；失败回填原队列
    _memPending = {};
    _persistPending();

    syncCart(items, _state.version)
      .then(res => {
        if (res && res.code === 'VERSION_CONFLICT') {
          // 多端冲突：以后端为准，丢弃本地变更（页面刷新后用户基于新版本重新操作）
          _memPending = {};
          _persistPending();
          resolve({ synced: false, changed: false, conflict: true });
        } else if (res && res.success) {
          _persistVersion(res.version);
          // 以服务端总件数校准全局徽标
          if (typeof getApp === 'function') {
            const app = getApp();
            if (app && app.setCartCount && res.cartCount != null) {
              app.setCartCount(res.cartCount);
            }
          }
          resolve({ synced: true, changed: true });
        } else {
          // 业务失败（库存不足等）：回填等待页面刷新后重新操作
          _memPending = pending;
          _persistPending();
          resolve({ synced: false, changed: false, error: (res && res.message) || '同步失败' });
        }
      })
      .catch(() => {
        // 网络异常：回填，等待下次时机（onShow/页面隐藏/结算）重试
        _memPending = pending;
        _persistPending();
        resolve({ synced: false, changed: false, error: '网络异常' });
      })
      .then(() => {
        _flushing = false;
      });
  });
}

// ====== 快照（Layer 1 服务端缓存） ======

/** 服务端拉取成功后缓存快照 */
export function setSnapshot(data, version) {
  if (!data) return;
  _state.cache = {
    validItems: data.validItems || [],
    invalidItems: data.invalidItems || [],
    selectedPrice: data.selectedPrice || 0,
    selectedCount: data.selectedCount || 0,
    updatedAt: Date.now(),
  };
  if (version != null) _persistVersion(version);
}

/** 读取服务端快照（无缓存返回 null） */
export function getSnapshot() {
  return _state.cache;
}


