// 首页逻辑
const questions = require('../../data/question.js').questions

Page({
  data: {
    // 题目总数（用于首页展示）
    totalQuestions: (questions || []).length,
    // 四维维度说明文案，供 WXML 循环渲染
    dimensions: [
      { key: 'EI', left: 'E', right: 'I', name: '外向外出 / 内向宅家', desc: '周末是组队出门，还是窝在宿舍充电' },
      { key: 'GT', left: 'G', right: 'T', name: '付出助人 / 求助索取', desc: '习惯先照顾室友，还是先顾好自己' },
      { key: 'SC', left: 'S', right: 'C', name: '独处独立 / 结伴群居', desc: '更享受独自待着，还是离不开热闹' },
      { key: 'PJ', left: 'P', right: 'J', name: '随性拖延 / 自律准时', desc: 'DDL 前一晚开冲，还是提前排好计划' }
    ]
  },
  startQuiz() {
    wx.navigateTo({ url: '/pages/quiz/quiz' })
  }
})
