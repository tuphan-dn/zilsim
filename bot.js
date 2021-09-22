require('./math')

class LPBot {
  constructor(A, B, amm) {
    this.A = A
    this.B = B
    this.amm = amm
    this.lpt = 0n
  }

  deposit = () => {
    const a = this.A.less()
    const b = (this.amm.B * a) / this.amm.A
    const { lpt } = this.amm.deposit(a, b)
    this.lpt = this.lpt + lpt
    this.A = this.A - a
    this.B = this.B - b
  }

  withdraw = () => {
    const lpt = this.lpt
    const { a, b } = this.amm.withdraw(lpt)
    this.lpt = this.lpt - lpt
    this.A = this.A + a
    this.B = this.B + b
  }
}

class SwapBot {
  constructor(A, B, amm) {
    this.A = A
    this.B = B
    this.amm = amm
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

  swap = (marketTrend = 0.5) => {
    // Sell A Buy B when signal is true
    // Sell B Buy A when signal is false
    const signal = Math.random() > marketTrend
    const bidType = signal ? 'A' : 'B'
    const askType = signal ? 'B' : 'A'
    if (signal) {
      const bidAmount = this.A.less()
      const askAmount = this.amm.swap(bidAmount, bidType, askType)
      this.record()
      return { bidAmount, askAmount }
    } else {
      const bidAmount = this.B.less()
      const askAmount = this.amm.swap(bidAmount, bidType, askType)
      this.record()
      return { bidAmount, askAmount }
    }
  }
}

module.exports = { LPBot, SwapBot }
