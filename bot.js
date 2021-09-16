require('./math')

class SwapBot {
  constructor(A, B, amm, trader = 1000n) {
    this.A = A
    this.B = B
    this.amm = amm
    this.trader = trader

    // History
    this.history = []
    this.record()
  }

  record = () => {
    const slice = {
      A: this.A,
      B: this.B,
    }
    this.history.push(slice)
  }

  swap = () => {
    // Sell A Buy B when signal is true
    // Sell B Buy A when signal is false
    const signal = Math.random() > 0.65
    const bidType = signal ? 'A' : 'B'
    const askType = signal ? 'B' : 'A'
    if (signal) {
      const bidAmount = (this.A / this.trader).less()
      const askAmount = this.amm.swap(bidAmount, bidType, askType)
      this.A = this.A - bidAmount
      this.B = this.B + askAmount
      this.record()
      return { bidAmount, askAmount }
    } else {
      const bidAmount = (this.B / this.trader).less()
      const askAmount = this.amm.swap(bidAmount, bidType, askType)
      this.B = this.B - bidAmount
      this.A = this.A + askAmount
      this.record()
      return { bidAmount, askAmount }
    }
  }
}

module.exports = { SwapBot }
