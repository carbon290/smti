/*
  顶部安全区工具
  ------------------------------------------------------------------
  app.json 里使用了 navigationStyle: "custom"（自定义导航栏），
  页面内容会从屏幕最顶端开始绘制，在带状态栏 / 刘海的真机上会被遮挡。
  这里统一计算顶部需要预留的高度，各页面在 WXML 顶部插入一个等高占位元素即可。

  取「状态栏高度」与「右上角胶囊下边缘」的较大值，保证内容既不压到状态栏，
  也不与胶囊按钮重叠（两者在不同机型上谁更大并不固定）。

  不依赖小程序运行环境也能调用（取不到系统信息时返回兜底值），
  因此可以直接被 scripts/verify.js 单元校验。
  ------------------------------------------------------------------
*/

// 兜底高度：取不到系统信息时按常见状态栏高度预留，避免内容顶格
const FALLBACK_TOP = 20

/**
 * 计算顶部需要预留的高度（px）
 * @param {object} [env] 可注入的运行环境 { wx }，默认取全局 wx
 * @returns {number} 需要预留的高度，单位 px
 */
function getTopSafeHeight(env) {
  const host = env && env.wx ? env.wx : (typeof wx !== 'undefined' ? wx : null)
  if (!host) return FALLBACK_TOP

  let statusBarHeight = 0
  let capsuleBottom = 0

  try {
    if (typeof host.getWindowInfo === 'function') {
      statusBarHeight = Number((host.getWindowInfo() || {}).statusBarHeight) || 0
    } else if (typeof host.getSystemInfoSync === 'function') {
      statusBarHeight = Number((host.getSystemInfoSync() || {}).statusBarHeight) || 0
    }
  } catch (e) {
    statusBarHeight = 0
  }

  try {
    if (typeof host.getMenuButtonBoundingClientRect === 'function') {
      capsuleBottom = Number((host.getMenuButtonBoundingClientRect() || {}).bottom) || 0
    }
  } catch (e) {
    capsuleBottom = 0
  }

  return Math.max(statusBarHeight, capsuleBottom, FALLBACK_TOP)
}

/**
 * 把安全区高度注入页面 data（模板中用 safeTop 渲染占位元素）
 * 用法：在页面 onLoad 里调用 applySafeArea(this)
 * @param {object} page 页面实例（Page 中的 this）
 * @returns {boolean} 是否成功注入
 */
function applySafeArea(page) {
  if (!page || typeof page.setData !== 'function') return false
  page.setData({ safeTop: getTopSafeHeight() })
  return true
}

module.exports = { FALLBACK_TOP, getTopSafeHeight, applySafeArea }
