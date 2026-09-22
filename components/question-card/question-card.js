Component({
  properties: {
    question: { type: Object, value: {} },
    selectedIndex: { type: Number, value: -1 },
    fontSize: { type: Number, value: 30 }
  },
  methods: {
    onChoose(e) {
      const idx = Number(e.currentTarget.dataset.index)
      const opt = this.properties.question && this.properties.question.options && this.properties.question.options[idx]
      this.triggerEvent('choose', { index: idx, option: opt })
    }
  }
})
