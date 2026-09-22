/* 简易分享工具：目前实现分享文本与简单提示，后续可扩展海报生成 */
function shareText(result){
  const title = `我的寝室人格：${result.code} - ${result.nick}`
  const desc = result.desc || ''
  wx.showModal({ title: '分享预览', content: title + '\n' + desc, showCancel:false })
}

module.exports = { shareText }
