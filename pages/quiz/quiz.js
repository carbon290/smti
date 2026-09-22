// 答题页核心逻辑
const questions = require('../../data/question.js').questions
const scoreUtil = require('../../utils/score.js')

Page({
  data: {
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
  goHome() {
    wx.navigateBack({ delta: 1 })
  }
})
