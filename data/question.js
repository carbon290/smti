// 题库示例：每题绑定维度与选项分数（简化版）
const questions = [
  { text: '周末更愿意和室友一起外出还是自己呆在宿舍？', options: [ { text:'一起外出', scores:{E:1} }, { text:'自己呆着', scores:{I:1} } ] },
  { text: '遇到室友需要帮助时，你更倾向于主动帮忙还是先考虑自己？', options: [ { text:'主动帮忙', scores:{G:1} }, { text:'先考虑自己', scores:{T:1} } ] },
  { text: '喜欢独自做事还是和室友一起做更开心？', options: [ { text:'独处更舒服', scores:{S:1} }, { text:'喜欢结伴', scores:{C:1} } ] },
  { text: '做事更随性随缘还是按计划执行？', options: [ { text:'随性', scores:{P:1} }, { text:'按计划', scores:{J:1} } ] },
  { text: '社交场合你会主动加入还是更多观察？', options: [ { text:'主动加入', scores:{E:1} }, { text:'更多观察', scores:{I:1} } ] },
  { text: '室友向你求助你会更倾向于长期提供帮助还是建议其自理？', options: [ { text:'长期帮助', scores:{G:1} }, { text:'建议自理', scores:{T:1} } ] },
  { text: '假期更愿意自己安排独处时间还是和朋友聚会？', options: [ { text:'独处', scores:{S:1} }, { text:'聚会', scores:{C:1} } ] },
  { text: '是否经常拖延到最后才完成任务？', options: [ { text:'经常拖延', scores:{P:1} }, { text:'很少拖延', scores:{J:1} } ] }
]

module.exports = { questions }
