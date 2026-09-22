/*
  计分算法：
  - 每道题的选项带有分值对象，如 {E:1} 或 {I:1}
  - 汇总所有分值后对比每一对字母的得分，得分高者为该维度结果
  返回结构：{ code: 'EGPJ', scores: { 'E/I':{a:..,b:..}, ... } }
*/
const questions = require('../data/question.js').questions

function calcResult(answers) {
  // 初始计分
  const counts = { E:0,I:0,G:0,T:0,S:0,C:0,P:0,J:0 }
  for (let i=0;i<answers.length;i++){
    const opt = answers[i]
    if (!opt || !opt.scores) continue
    for (const k in opt.scores) {
      counts[k] = (counts[k]||0) + opt.scores[k]
    }
  }
  // 维度对比
  const scorePairs = {
    'E/I': ['E','I'],
    'G/T': ['G','T'],
    'S/C': ['S','C'],
    'P/J': ['P','J']
  }
  let code = ''
  const scores = {}
  for (const dim in scorePairs) {
    const a = scorePairs[dim][0]
    const b = scorePairs[dim][1]
    const va = counts[a]||0
    const vb = counts[b]||0
    scores[dim] = { a: va, b: vb }
    code += (va >= vb) ? a : b
  }
  return { code, counts, scores }
}

module.exports = { calcResult }
