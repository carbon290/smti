// 答题页核心逻辑
const questions = require('../../data/question.js').questions
const scoreUtil = require('../../utils/score.js')
const safeArea = require('../../utils/safe-area.js')

Page({
  data: {
    // 顶部安全区高度（px）：navigationStyle 为 custom，需要占位避免内容压到状态栏
    safeTop: 0,
    questions: questions || [],
    total: (questions || []).length,
    current: 0,
    question: (questions && questions.length) ? questions[0] : {},
    answers: [],
    answerMap: {},
    selectedIndex: -1,
    fontSize: 30
  },
  onLoad() {
    safeArea.applySafeArea(this)
    this.syncCurrentSelection()
  },
  syncCurrentSelection() {
    const idx = this.data.answerMap[this.data.current]
    this.setData({ selectedIndex: typeof idx === 'number' ? idx : -1 })
  },
  choose(e) {
    const detail = e.detail || {}
    const index = Number(detail.index)
    const opt = detail.option || (this.data.question && this.data.question.options && this.data.question.options[index])
    const answers = this.data.answers.slice()
    const answerMap = Object.assign({}, this.data.answerMap)

    answers[this.data.current] = opt
    answerMap[this.data.current] = index

    this.setData({ answers, answerMap, selectedIndex: index })

    if (this.data.current + 1 >= this.data.total) {
      const result = scoreUtil.calcResult(answers)
      wx.setStorageSync('lastResult', result)
      wx.redirectTo({ url: '/pages/result/result' })
      return
    }

    this.next()
  },
  prev() {
    if (this.data.current === 0) return
    const curr = this.data.current - 1
    this.setData({ current: curr, question: this.data.questions[curr] })
    this.syncCurrentSelection()
  },
  next() {
    if (this.data.current + 1 >= this.data.total) return
    const curr = this.data.current + 1
    this.setData({ current: curr, question: this.data.questions[curr] })
    this.syncCurrentSelection()
  },
  /** 返回上一页；直接进答题页（没有上一页）时回首页 */
  goHome() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  }
})
