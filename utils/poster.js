/*
  海报生成工具
  ------------------------------------------------------------------
  设计说明：
  小程序存在两种画布能力：
    1. 离屏 canvas（wx.createOffscreenCanvas）—— 纯 JS 接口，不依赖渲染层，
       在 Skyline / WebView 下表现一致，作为首选方案。
    2. 页面内 canvas 组件节点 —— 官方文档中 canvasToTempFilePath 推荐传入的实例，
       作为离屏方案不可用时的兜底。
  两条路径共用同一份绘制逻辑 drawPoster()，保证海报外观一致。
  ------------------------------------------------------------------
*/

// 画布逻辑尺寸。注意：Canvas 2D 单边最大 1365，超出可能引发异常
const POSTER_WIDTH = 600
const POSTER_HEIGHT = 900

// 导出倍率，用于输出高清图
const EXPORT_SCALE = 2

// 海报配色，与页面主题保持一致
const COLORS = {
  bgTop: '#f4fbff',
  bgBottom: '#e7f2ff',
  card: '#ffffff',
  boxBorder: '#d9e8fa',
  title: '#1d2b3a',
  sub: '#7b8b9e',
  accent: '#1d7fd4',
  accentAlt: '#16a882',
  track: '#e9eef8',
  body: '#5b6c80',
  divider: '#dde8f6'
}

/**
 * 绘制圆角矩形路径（Canvas 2D 不保证支持 roundRect，这里手动实现）
 * 纯计算逻辑，无副作用，便于单元测试
 */
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 按最大宽度把文本拆成多行
 * 中文无空格，因此按字符逐个累加测量；英文单词同样能正确断行
 * @param {object} ctx 具备 measureText 能力的绘图上下文
 * @param {string} text 原始文本
 * @param {number} maxWidth 单行最大宽度
 * @returns {string[]} 拆好的行数组
 */
function wrapText(ctx, text, maxWidth) {
  const chars = String(text == null ? '' : text).split('')
  const lines = []
  let line = ''

  for (let i = 0; i < chars.length; i++) {
    const next = line + chars[i]
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = chars[i]
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * 计算海报中四个维度的纵向布局位置
 * 抽出来便于校验排版不会超出画布
 */
function calcDimRows(startY, rowHeight, count) {
  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push(startY + i * rowHeight)
  }
  return rows
}

// 海报排版常量，集中定义便于调整与校验
const LAYOUT = {
  labelY: 76,
  codeTop: 130,
  codeBoxW: 92,
  codeBoxH: 104,
  codeGap: 16,
  nickY: 302,
  sloganY: 350,
  tagsY: 392,
  dividerY: 444,
  sectionY: 486,
  dimStartY: 520,
  dimRowHeight: 74,
  dimCount: 4,
  footerDividerY: 830,
  footerY: 866
}

/** 海报内容最底部的 y 坐标，用于校验是否超出画布 */
function layoutBottom() {
  const rows = calcDimRows(LAYOUT.dimStartY, LAYOUT.dimRowHeight, LAYOUT.dimCount)
  const lastRow = rows[rows.length - 1]
  // 每行内容：标题 + 进度条 + 百分比文本
  return Math.max(lastRow + 56, LAYOUT.footerY + 20)
}

/** 绘制一条细分割线 */
function drawDivider(ctx, y) {
  ctx.save()
  ctx.strokeStyle = COLORS.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, y)
  ctx.lineTo(POSTER_WIDTH - 60, y)
  ctx.stroke()
  ctx.restore()
}

/**
 * 海报核心绘制逻辑
 * @param {object} ctx Canvas 2D 上下文
 * @param {object} data { code, nick, slogan, tags, dimensions }
 */
function drawPoster(ctx, data) {
  const W = POSTER_WIDTH
  const H = POSTER_HEIGHT
  const code = (data && data.code) || '----'
  const nick = (data && data.nick) || ''
  const slogan = (data && data.slogan) || ''
  const tags = (data && data.tags) || []
  const dimensions = (data && data.dimensions) || []

  // ---------- 背景 ----------
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, COLORS.bgTop)
  bg.addColorStop(1, COLORS.bgBottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 左上角柔光装饰
  ctx.save()
  ctx.globalAlpha = 0.55
  const glow = ctx.createRadialGradient(70, 60, 10, 70, 60, 240)
  glow.addColorStop(0, 'rgba(105, 183, 255, 0.45)')
  glow.addColorStop(1, 'rgba(105, 183, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 400, 400)
  ctx.restore()

  ctx.textAlign = 'center'

  // ---------- 顶部标签 ----------
  ctx.fillStyle = COLORS.sub
  ctx.font = '22px sans-serif'
  ctx.fillText('寝室人格测评 · 宿舍版 MBTI', W / 2, LAYOUT.labelY)

  // ---------- 四个人格字母方块 ----------
  const letters = code.split('')
  const boxW = LAYOUT.codeBoxW
  const boxH = LAYOUT.codeBoxH
  const gap = LAYOUT.codeGap
  const totalW = letters.length * boxW + (letters.length - 1) * gap
  const startX = (W - totalW) / 2

  letters.forEach((letter, i) => {
    const x = startX + i * (boxW + gap)
    const y = LAYOUT.codeTop

    ctx.save()
    roundRectPath(ctx, x, y, boxW, boxH, 20)
    ctx.fillStyle = COLORS.card
    ctx.fill()
    ctx.strokeStyle = COLORS.boxBorder
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = COLORS.accent
    ctx.font = 'bold 50px sans-serif'
    ctx.fillText(letter, x + boxW / 2, y + boxH / 2 + 18)
  })

  // ---------- 昵称与标语 ----------
  ctx.fillStyle = COLORS.title
  ctx.font = 'bold 42px sans-serif'
  ctx.fillText(nick, W / 2, LAYOUT.nickY)

  ctx.fillStyle = COLORS.sub
  ctx.font = '24px sans-serif'
  ctx.fillText(slogan, W / 2, LAYOUT.sloganY)

  // ---------- 标签（单行拼接） ----------
  if (tags.length) {
    ctx.fillStyle = COLORS.accent
    ctx.font = '22px sans-serif'
    ctx.fillText(tags.join(' · '), W / 2, LAYOUT.tagsY)
  }

  drawDivider(ctx, LAYOUT.dividerY)

  // ---------- 四维分布 ----------
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.title
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText('四维分布', 60, LAYOUT.sectionY)

  const rows = calcDimRows(LAYOUT.dimStartY, LAYOUT.dimRowHeight, LAYOUT.dimCount)
  const barX = 60
  const barW = W - 120
  const barH = 14

  dimensions.forEach((dim, i) => {
    if (i >= rows.length) return
    const y = rows[i]
    const percent = typeof dim.percent === 'number' ? dim.percent : 50

    // 维度名（左）与命中结果（右）
    ctx.fillStyle = COLORS.body
    ctx.font = '23px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(dim.left + ' / ' + dim.right, barX, y)

    ctx.textAlign = 'right'
    ctx.fillStyle = COLORS.accent
    ctx.font = 'bold 23px sans-serif'
    ctx.fillText(dim.winnerName || '', barX + barW, y)

    // 进度条底槽
    const barY = y + 18
    ctx.save()
    roundRectPath(ctx, barX, barY, barW, barH, barH / 2)
    ctx.fillStyle = COLORS.track
    ctx.fill()
    ctx.restore()

    // 进度条填充（左端字母占比）
    const fillW = Math.max(barH, (barW * percent) / 100)
    const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0)
    fill.addColorStop(0, '#69b7ff')
    fill.addColorStop(1, '#7ad7b8')
    ctx.save()
    roundRectPath(ctx, barX, barY, fillW, barH, barH / 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()

    // 左右占比文字
    ctx.fillStyle = COLORS.sub
    ctx.font = '21px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(dim.left + ' ' + percent + '%', barX, y + 54)

    ctx.textAlign = 'right'
    ctx.fillText((100 - percent) + '% ' + dim.right, barX + barW, y + 54)
  })

  // ---------- 页脚 ----------
  drawDivider(ctx, LAYOUT.footerDividerY)

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.sub
  ctx.font = '22px sans-serif'
  ctx.fillText('长按保存 / 分享给室友，测测你们的宿舍人格', W / 2, LAYOUT.footerY)
}

/** 把海报数据整理成绘图需要的结构 */
function normalizeData(raw) {
  const dimensions = (raw && raw.dimensions) || []
  return {
    code: (raw && raw.code) || '----',
    nick: (raw && raw.nick) || '',
    slogan: (raw && raw.slogan) || '',
    tags: (raw && raw.tags) || [],
    dimensions: dimensions.map(dim => ({
      left: dim.left,
      right: dim.right,
      percent: typeof dim.percent === 'number' ? dim.percent : 50,
      winnerName: dim.winnerName || ''
    }))
  }
}

/** 创建离屏画布，不可用时返回 null */
function createOffscreenCanvas() {
  if (typeof wx === 'undefined' || typeof wx.createOffscreenCanvas !== 'function') return null
  try {
    const canvas = wx.createOffscreenCanvas({
      type: '2d',
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT
    })
    return canvas && typeof canvas.getContext === 'function' ? canvas : null
  } catch (e) {
    return null
  }
}

/** 在指定画布上绘制并导出图片 */
function renderAndExport(canvas, data) {
  return new Promise((resolve, reject) => {
    let ctx = null
    try {
      ctx = canvas.getContext('2d')
    } catch (e) {
      reject(e)
      return
    }
    if (!ctx) {
      reject(new Error('无法获取画布上下文'))
      return
    }

    // 显式设置画布尺寸，避免默认 300x150 导致内容被裁掉
    canvas.width = POSTER_WIDTH
    canvas.height = POSTER_HEIGHT

    try {
      drawPoster(ctx, data)
    } catch (e) {
      reject(e)
      return
    }

    if (typeof wx.canvasToTempFilePath !== 'function') {
      reject(new Error('当前基础库不支持导出图片'))
      return
    }

    wx.canvasToTempFilePath({
      canvas: canvas,
      x: 0,
      y: 0,
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      destWidth: POSTER_WIDTH * EXPORT_SCALE,
      destHeight: POSTER_HEIGHT * EXPORT_SCALE,
      fileType: 'png',
      success: res => resolve(res.tempFilePath),
      fail: err => reject(err)
    })
  })
}

/**
 * 生成海报图片
 * @param {object} raw 海报数据
 * @param {object} [pageCanvasNode] 页面内 canvas 节点，作为兜底画布
 * @returns {Promise<string>} 图片临时路径
 */
function generate(raw, pageCanvasNode) {
  const data = normalizeData(raw)

  // 首选离屏画布：不依赖渲染层，Skyline 下更稳
  const offscreen = createOffscreenCanvas()

  if (offscreen) {
    return renderAndExport(offscreen, data).catch(err => {
      // 离屏导出失败时，回退到页面内 canvas 节点
      if (pageCanvasNode) {
        return renderAndExport(pageCanvasNode, data)
      }
      throw err
    })
  }

  if (pageCanvasNode) {
    return renderAndExport(pageCanvasNode, data)
  }

  return Promise.reject(new Error('当前环境不支持生成海报，请升级微信版本后重试'))
}

/**
 * 保存图片到相册
 * @returns {Promise<void>}
 */
function saveToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof wx.saveImageToPhotosAlbum !== 'function') {
      reject(new Error('当前基础库不支持保存到相册'))
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => resolve(),
      fail: err => reject(err)
    })
  })
}

/** 判断错误是否为相册权限被拒绝 */
function isAuthDenied(err) {
  const msg = (err && err.errMsg) || ''
  return msg.indexOf('auth deny') > -1 || msg.indexOf('auth denied') > -1 || msg.indexOf('authorize') > -1
}

module.exports = {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  LAYOUT,
  COLORS,
  drawPoster,
  normalizeData,
  roundRectPath,
  wrapText,
  calcDimRows,
  layoutBottom,
  generate,
  saveToAlbum,
  isAuthDenied
}
