// 结果页逻辑：读取本地计分结果 -> 匹配人格文案 -> 组装四维分析 -> 生成海报
const { getPersonality } = require('../../data/personality.js')
const poster = require('../../utils/poster.js')

// 维度元信息，顺序需与 utils/score.js 中拼接 code 的顺序保持一致
const DIMENSIONS = [
  { key: 'E/I', left: 'E', right: 'I', leftName: '外向外出', rightName: '内向宅家' },
  { key: 'G/T', left: 'G', right: 'T', leftName: '付出助人', rightName: '求助索取' },
  { key: 'S/C', left: 'S', right: 'C', leftName: '独处独立', rightName: '结伴群居' },
  { key: 'P/J', left: 'P', right: 'J', leftName: '随性拖延', rightName: '自律准时' }
]

Page({
  data: {
    code: '',
    letters: [],      // 人格代码拆分后的 4 个字母
    nick: '',
    slogan: '',
    desc: '',
    traits: [],
    roommates: [],
    tags: [],
    dimensions: [],   // 四维得分分析
    posterUrl: '',    // 生成的海报临时路径
    showPoster: false,// 是否展示海报预览层
    generating: false // 生成中状态，防止重复点击
  },

  onLoad() {
    this.buildResult()
  },

  /**
   * 页面渲染完成后获取兜底画布节点
   * 离屏画布不可用时，会改用这个页面内节点导出图片
   */
  onReady() {
    this.prepareCanvasFallback()
  },

  /** 查询页面内隐藏 canvas 的节点实例 */
  prepareCanvasFallback() {
    if (typeof wx.createSelectorQuery !== 'function') return

    wx.createSelectorQuery()
      .select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        const item = res && res[0]
        if (item && item.node) {
          // 显式设置尺寸，避免默认 300x150 导致内容被裁切
          item.node.width = poster.POSTER_WIDTH
          item.node.height = poster.POSTER_HEIGHT
          this.posterCanvasNode = item.node
        }
      })
  },

  /** 组装结果页所需数据 */
  buildResult() {
    const stored = wx.getStorageSync('lastResult')

    // 没有有效结果时，回到答题页重新开始
    if (!stored || !stored.code) {
      wx.showToast({ title: '还没有测评结果', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/quiz/quiz' })
      }, 800)
      return
    }

    const personality = getPersonality(stored.code)
    const dimensions = this.buildDimensions(stored)

    this.setData({
      code: stored.code,
      letters: stored.code.split(''),
      nick: personality.nick,
      slogan: personality.slogan,
      desc: personality.desc,
      traits: personality.traits || [],
      roommates: personality.roommates || [],
      tags: personality.tags || [],
      dimensions
    })
  },

  /**
   * 计算四维展示数据
   * percent 表示左侧字母的占比，leftWin 表示该维度最终命中的是左侧字母
   */
  buildDimensions(stored) {
    const scores = stored.scores || {}
    const code = stored.code || ''

    return DIMENSIONS.map((dim, i) => {
      const pair = scores[dim.key] || { a: 0, b: 0 }
      const total = pair.a + pair.b
      const percent = total > 0 ? Math.round((pair.a / total) * 100) : 50
      const hitLetter = code.charAt(i)

      return {
        key: dim.key,
        title: dim.leftName + ' / ' + dim.rightName,
        left: dim.left,
        right: dim.right,
        a: pair.a,
        b: pair.b,
        percent: percent,
        leftWin: hitLetter === dim.left,
        rightWin: hitLetter === dim.right,
        winnerName: hitLetter === dim.left
          ? dim.left + ' · ' + dim.leftName
          : dim.right + ' · ' + dim.rightName,
        // 左右两端各自的占比，用于文案展示
        leftPercent: percent,
        rightPercent: 100 - percent
      }
    })
  },

  /** 重新测评：清空结果并回到答题页 */
  restart() {
    wx.removeStorageSync('lastResult')
    wx.redirectTo({ url: '/pages/quiz/quiz' })
  },

  /** 生成海报并弹出预览 */
  openPoster() {
    if (this.data.generating) return

    this.setData({ generating: true })
    wx.showLoading({ title: '生成中', mask: true })

    poster
      .generate({
        code: this.data.code,
        nick: this.data.nick,
        slogan: this.data.slogan,
        tags: this.data.tags,
        dimensions: this.data.dimensions
      }, this.posterCanvasNode)
      .then(filePath => {
        wx.hideLoading()
        this.setData({ generating: false, posterUrl: filePath, showPoster: true })
      })
      .catch(err => {
        wx.hideLoading()
        this.setData({ generating: false })
        console.error('[poster] 生成失败：', err)
        wx.showToast({ title: '生成失败，请稍后重试', icon: 'none' })
      })
  },

  /** 关闭海报预览 */
  closePoster() {
    this.setData({ showPoster: false })
  },

  /** 阻止蒙层滚动穿透 */
  noop() {},

  /** 保存海报到相册 */
  savePoster() {
    if (!this.data.posterUrl) return

    poster
      .saveToAlbum(this.data.posterUrl)
      .then(() => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        this.setData({ showPoster: false })
      })
      .catch(err => {
        console.error('[poster] 保存失败：', err)
        if (poster.isAuthDenied(err)) {
          this.askAlbumPermission()
        } else {
          wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        }
      })
  },

  /** 相册权限被拒后引导用户去设置页开启 */
  askAlbumPermission() {
    wx.showModal({
      title: '需要相册权限',
      content: '保存海报需要访问相册，请在设置中开启「保存到相册」权限。',
      confirmText: '去设置',
      success: res => {
        if (res.confirm) {
          wx.openSetting({
            success: setting => {
              if (setting.authSetting['scope.writePhotosAlbum']) {
                this.savePoster()
              }
            }
          })
        }
      }
    })
  },

  /** 返回首页 */
  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  /** 转发给好友 */
  onShareAppMessage() {
    const { code, nick } = this.data
    return {
      title: code ? `我的寝室人格是 ${code} · ${nick}，你呢？` : '寝室人格测评，来测测你的宿舍人格',
      path: '/pages/index/index'
    }
  },

  /** 分享到朋友圈 */
  onShareTimeline() {
    const { code, nick } = this.data
    return {
      title: code ? `我的寝室人格是 ${code} · ${nick}` : '寝室人格测评'
    }
  }
})
