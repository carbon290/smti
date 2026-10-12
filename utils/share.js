/*
  分享工具
  ------------------------------------------------------------------
  小程序有三条分享路径，文案由页面的 onShareAppMessage / onShareTimeline 提供，
  这里只封装调用细节：
    1. enableShareMenu() —— 打开右上角「⋯」菜单里的转发入口。
       页面没有实现 onShareAppMessage 时，菜单项是灰的，必须显式调用。
    2. shareImage() —— 把生成好的海报图片直接送进微信分享面板。
    3. encodeResult() / parseResultQuery() —— 把结果编码进分享链接，好友点开卡片时
       由结果页还原，直接看到分享者的结果（否则只能落回首页）。
  ------------------------------------------------------------------
*/

// 维度顺序必须与 utils/score.js 拼接 code 的顺序保持一致
const DIM_KEYS = ['E/I', 'G/T', 'S/C', 'P/J']
const DIM_LETTERS = [['E', 'I'], ['G', 'T'], ['S', 'C'], ['P', 'J']]

/** 4 个字母都必须落在对应维度的两个字母内，防止手改链接拼出脏数据 */
function isValidCode(code) {
  if (!/^[A-Z]{4}$/.test(code)) return false
  for (let i = 0; i < DIM_LETTERS.length; i++) {
    if (DIM_LETTERS[i].indexOf(code.charAt(i)) === -1) return false
  }
  return true
}

/**
 * 把测评结果编码成分享链接的 query
 * @param {{code:string, scores:object}} result
 * @returns {string} 形如 code=EGSP&d=2-1_2-0_1-1_1-0；代码非法时返回空串
 */
function encodeResult(result) {
  const code = String((result && result.code) || '').toUpperCase()
  if (!isValidCode(code)) return ''
  const scores = (result && result.scores) || {}
  const d = DIM_KEYS.map(key => {
    const pair = scores[key] || {}
    return (Number(pair.a) || 0) + '-' + (Number(pair.b) || 0)
  }).join('_')
  return 'code=' + code + '&d=' + d
}

/**
 * 解析分享链接参数，还原出分享者的结果
 * 分值缺失/损坏时只丢四维分布（页面退化成各 50%），人格代码仍然可用
 * @param {object} query 页面 onLoad 收到的 options
 * @returns {{code:string, scores:object}|null}
 */
function parseResultQuery(query) {
  const code = String((query && query.code) || '').toUpperCase()
  if (!isValidCode(code)) return null

  const parts = String((query && query.d) || '').split('_')
  const scores = {}
  DIM_KEYS.forEach((key, i) => {
    const seg = String(parts[i] || '').split('-')
    const a = parseInt(seg[0], 10)
    const b = parseInt(seg[1], 10)
    if (a >= 0 && b >= 0) scores[key] = { a, b }
  })
  return { code, scores }
}

/**
 * 开启右上角菜单的转发能力
 * @returns {boolean} 是否成功发起调用
 */
function enableShareMenu() {
  if (typeof wx === 'undefined' || typeof wx.showShareMenu !== 'function') return false
  wx.showShareMenu({
    withShareTicket: false,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  return true
}

/**
 * 把图片（如生成好的海报）直接分享给好友
 * 依赖基础库 2.14.4+ 的 wx.showShareImageMenu，低版本会 reject
 * @param {string} filePath 本地图片临时路径
 * @returns {Promise<void>}
 */
function shareImage(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject(new Error('图片路径为空'))
      return
    }
    if (typeof wx === 'undefined' || typeof wx.showShareImageMenu !== 'function') {
      reject(new Error('当前微信版本不支持直接分享图片，可长按图片保存'))
      return
    }
    wx.showShareImageMenu({
      path: filePath,
      success: () => resolve(),
      fail: err => reject(err)
    })
  })
}

/**
 * 判断是否为用户主动取消（取消不需要弹提示打扰用户）
 * @param {object} err 失败对象
 * @returns {boolean}
 */
function isCancelError(err) {
  const msg = (err && (err.errMsg || err.message)) || ''
  return /cancel|取消/i.test(msg)
}

module.exports = { enableShareMenu, shareImage, isCancelError, encodeResult, parseResultQuery }
