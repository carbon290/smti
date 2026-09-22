/*
  本地校验脚本（不参与小程序打包）
  运行方式：node scripts/verify.js
  作用：
    1. 校验 16 种人格代码是否全部有文案
    2. 校验计分算法对四个维度的判定是否正确
*/
const path = require('path')

const { mapping, getPersonality, allCodes } = require(path.join(__dirname, '../data/personality.js'))
const { calcResult } = require(path.join(__dirname, '../utils/score.js'))
const { questions } = require(path.join(__dirname, '../data/question.js'))

let failed = 0
function assert(condition, message) {
  if (condition) {
    console.log('  PASS  ' + message)
  } else {
    failed++
    console.log('  FAIL  ' + message)
  }
}

console.log('\n[1] 题库检查')
assert(Array.isArray(questions) && questions.length > 0, '题库非空，共 ' + questions.length + ' 题')
const badQuestion = questions.find(q => !q.text || !Array.isArray(q.options) || q.options.length < 2)
assert(!badQuestion, '每道题都有题干且至少两个选项')
const badOption = questions.find(q => q.options.some(o => !o.scores || Object.keys(o.scores).length === 0))
assert(!badOption, '每个选项都绑定了维度分值')

console.log('\n[2] 人格代码覆盖检查')
const expected = []
const letters = [['E', 'I'], ['G', 'T'], ['S', 'C'], ['P', 'J']]
letters[0].forEach(a => letters[1].forEach(b => letters[2].forEach(c => letters[3].forEach(d => {
  expected.push(a + b + c + d)
}))))
assert(allCodes.length === 16, '共有 16 种人格类型（实际 ' + allCodes.length + '）')
const missing = expected.filter(code => !mapping[code])
assert(missing.length === 0, '所有组合都有文案，缺失：' + (missing.join(',') || '无'))
const incomplete = allCodes.filter(code => {
  const p = mapping[code]
  return !p.nick || !p.slogan || !p.desc || !p.traits.length || !p.roommates.length || !p.tags.length
})
assert(incomplete.length === 0, '每个类型的昵称/标签/解读/特点/适配室友都完整，缺失：' + (incomplete.join(',') || '无'))

console.log('\n[3] 计分算法检查')
// 全选第一个选项：E / G / 可能 S 或 C / P，只校验能算出合法 4 字母代码
const firstAnswers = questions.map(q => q.options[0])
const r1 = calcResult(firstAnswers)
assert(/^[EI][GT][SC][PJ]$/.test(r1.code), '全选首项得到合法代码：' + r1.code)
assert(getPersonality(r1.code).nick !== '神秘室友', '该代码能匹配到真实文案：' + getPersonality(r1.code).nick)

// 全选第二个选项
const secondAnswers = questions.map(q => q.options[1])
const r2 = calcResult(secondAnswers)
assert(/^[EI][GT][SC][PJ]$/.test(r2.code), '全选次项得到合法代码：' + r2.code)

// 构造一份精确控制的结果：全部选 E / G / C / J 对应选项
const counts = { E: 0, I: 0, G: 0, T: 0, S: 0, C: 0, P: 0, J: 0 }
firstAnswers.forEach(o => Object.keys(o.scores).forEach(k => { counts[k] += o.scores[k] }))
assert(counts.E > 0, 'E 维度有得分：' + counts.E)
assert(counts.G > 0, 'G 维度有得分：' + counts.G)

// 校验维度得分结构与 code 顺序一致
assert(r1.scores['E/I'] && typeof r1.scores['E/I'].a === 'number', '得分结构包含 E/I 维度')
assert(r1.code.charAt(0) === (r1.scores['E/I'].a >= r1.scores['E/I'].b ? 'E' : 'I'), 'code 第 1 位与 E/I 得分一致')
assert(r1.code.charAt(1) === (r1.scores['G/T'].a >= r1.scores['G/T'].b ? 'G' : 'T'), 'code 第 2 位与 G/T 得分一致')
assert(r1.code.charAt(2) === (r1.scores['S/C'].a >= r1.scores['S/C'].b ? 'S' : 'C'), 'code 第 3 位与 S/C 得分一致')
assert(r1.code.charAt(3) === (r1.scores['P/J'].a >= r1.scores['P/J'].b ? 'P' : 'J'), 'code 第 4 位与 P/J 得分一致')

console.log('\n[4] 兜底逻辑检查')
assert(getPersonality('XXXX').nick === '神秘室友', '未知代码返回兜底文案')

console.log('\n[5] 海报绘制逻辑检查')
const poster = require(path.join(__dirname, '../utils/poster.js'))

// 构造一个记录所有绘图调用的假 context，用来验证绘制流程本身
function createFakeContext(perCharWidth) {
  const calls = []
  const record = name => function () {
    calls.push({ name: name, args: Array.prototype.slice.call(arguments) })
  }
  const gradient = { addColorStop: function () {} }
  return {
    calls: calls,
    measureText: function (t) { return { width: String(t).length * perCharWidth } },
    createLinearGradient: function () { return gradient },
    createRadialGradient: function () { return gradient },
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    closePath: record('closePath'),
    save: record('save'),
    restore: record('restore'),
    fillRect: record('fillRect'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillText: record('fillText')
  }
}

// 画布尺寸不能超过官方 1365 上限
assert(poster.POSTER_WIDTH <= 1365 && poster.POSTER_HEIGHT <= 1365,
  '画布尺寸 ' + poster.POSTER_WIDTH + 'x' + poster.POSTER_HEIGHT + ' 未超过 1365 上限')

// 排版不能溢出画布
const bottom = poster.layoutBottom()
assert(bottom <= poster.POSTER_HEIGHT, '海报内容底部 ' + bottom + 'px 未超出画布 ' + poster.POSTER_HEIGHT + 'px')

// 文本换行：每字符 10px，限制 100px 时每行最多 10 字
const wrapCtx = { measureText: t => ({ width: String(t).length * 10 }) }
const lines = poster.wrapText(wrapCtx, '一二三四五六七八九十一二三四五', 100)
assert(lines.length === 2, '超长文本被拆成 ' + lines.length + ' 行（预期 2 行）')
assert(lines[0].length === 10, '第一行恰好 10 个字')
assert(lines.join('') === '一二三四五六七八九十一二三四五', '换行后文本内容没有丢失')

// 空文本与 null 不应抛错
assert(poster.wrapText(wrapCtx, '', 100).length === 0, '空文本返回空数组')
assert(poster.wrapText(wrapCtx, null, 100).length === 0, 'null 文本返回空数组')

// 圆角矩形路径：moveTo + 4 段 lineTo + 4 段 quadraticCurveTo + closePath
const pathCtx = createFakeContext(10)
poster.roundRectPath(pathCtx, 0, 0, 100, 60, 12)
const countOf = name => pathCtx.calls.filter(c => c.name === name).length
assert(countOf('beginPath') === 1, '圆角矩形以 beginPath 开始')
assert(countOf('lineTo') === 4, '圆角矩形有 4 条直线边（实际 ' + countOf('lineTo') + '）')
assert(countOf('quadraticCurveTo') === 4, '圆角矩形有 4 个圆角（实际 ' + countOf('quadraticCurveTo') + '）')
assert(countOf('closePath') === 1, '圆角矩形路径闭合')

// 半径超过边长一半时应被收敛，不应产生负半径
const clampCtx = createFakeContext(10)
poster.roundRectPath(clampCtx, 0, 0, 20, 20, 999)
const firstMove = clampCtx.calls.find(c => c.name === 'moveTo')
assert(firstMove.args[0] === 10, '半径被收敛到边长一半（moveTo x = ' + firstMove.args[0] + '）')

// 完整绘制一张海报，验证不抛错且关键内容都被画出来
const drawCtx = createFakeContext(10)
const sampleDimensions = [
  { key: 'E/I', left: 'E', right: 'I', percent: 75, winnerName: 'E · 外向外出' },
  { key: 'G/T', left: 'G', right: 'T', percent: 50, winnerName: 'G · 付出助人' },
  { key: 'S/C', left: 'S', right: 'C', percent: 25, winnerName: 'C · 结伴群居' },
  { key: 'P/J', left: 'P', right: 'J', percent: 100, winnerName: 'J · 自律准时' }
]
let drawError = null
try {
  poster.drawPoster(drawCtx, {
    code: 'EGCJ',
    nick: '寝室主心骨',
    slogan: '有我在，寝室就不会散',
    tags: ['宿舍组织者', '热心肠'],
    dimensions: sampleDimensions
  })
} catch (e) {
  drawError = e
}
assert(!drawError, 'drawPoster 正常执行不抛错' + (drawError ? '：' + drawError.message : ''))

const texts = drawCtx.calls.filter(c => c.name === 'fillText').map(c => c.args[0])
assert(texts.indexOf('寝室主心骨') > -1, '海报上画出了人格昵称')
assert(texts.indexOf('有我在，寝室就不会散') > -1, '海报上画出了 slogan')
assert(texts.indexOf('E') > -1 && texts.indexOf('G') > -1 && texts.indexOf('C') > -1 && texts.indexOf('J') > -1,
  '海报上画出了 4 个人格字母')
assert(texts.indexOf('E 75%') > -1, '海报上画出了维度占比文字')
assert(texts.indexOf('E · 外向外出') > -1, '海报上画出了维度命中结果')

// 数据清洗：缺字段时不应崩溃
const normalized = poster.normalizeData({})
assert(normalized.code === '----', '缺失 code 时使用占位符')
assert(normalized.dimensions.length === 0, '缺失 dimensions 时返回空数组')
assert(poster.normalizeData({ dimensions: [{ left: 'E', right: 'I' }] }).dimensions[0].percent === 50,
  '维度缺少 percent 时默认 50')

// 无任何画布能力时应明确报错，而不是静默失败或卡住
// 注意：这是 Promise，需要在回调里结算结果，所以把汇总放到链尾
poster.generate({ code: 'EGCJ', dimensions: [] }, null)
  .then(() => {
    assert(false, '没有任何画布时应当 reject，而不是 resolve')
  })
  .catch(err => {
    assert(/不支持生成海报/.test(err.message), '无画布时给出明确报错：' + err.message)
  })
  .then(() => {
    console.log('\n' + (failed === 0 ? '全部通过 ✅' : '存在 ' + failed + ' 项失败 ❌'))
    process.exit(failed === 0 ? 0 : 1)
  })
