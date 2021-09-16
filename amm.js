require('./math')

const TAX = 500000000000000n

class AMM {
  constructor(A, B) {
    this.A = A
    this.B = B
    this.liquidity = 0n

    this.anchor = { A, B }

    // History
    this.history = []
    this.record()
  }

  get _LIQUIDITY() {
    return this._liquidity(this.A, this.B)
  }

  // Min A
  get _A() {
    if (this.A < this.anchor.A) return this.A
    else return this.anchor.A
  }

  // Min B
  get _B() {
    if (this.B < this.anchor.B) return this.B
    else return this.anchor.B
  }

  _liquidity = (a, b) => {
    return (a * b).sqrt()
  }

  record = () => {
    const slice = {
      A: this.A,
      B: this.B,
      anchor: { ...this.anchor },
    }
    this.history.push(slice)
  }

  deposit = (a, b) => {
    if (a <= 0n || b <= 0n) throw new Error('Negative numbers')
    const A = this.A + this.vault.A
    const B = this.B + this.vault.B
    // |a| >= |b|
    if (a * B >= b * A) {
      // Estimate ratio
      const bMain = (b * this.B) / B
      const bVault = b - bMain
      const aMain = (b * this.A) / B
      const aVault = (b * this.vault.B) / B
      const lpt = (aMain * bMain).sqrt()
      // Update
      this.A = this.A + aMain
      this.B = this.B + bMain
      this.anchor.A = this.anchor.A + aVault
      this.anchor.B = this.anchor.B + bMain
      // Return
      return {
        a: a - aMain - aVault,
        b: b - bMain - bVault,
        lpt,
      }
    }
    // |a| < |b|
    else {
      // Estimate ratio
      const aMain = (a * this.A) / A
      const aVault = a - aMain
      const bMain = (a * this.B) / A
      const bVault = (a * this.vault.B) / A
      const lpt = (aMain * bMain).sqrt()
      // Update
      this.A = this.A + aMain
      this.B = this.B + bMain
      this.anchor.A = this.anchor.A + aVault
      this.anchor.B = this.anchor.B + bMain
      // Return
      return {
        a: a - aMain - aVault,
        b: b - bMain - bVault,
        lpt,
      }
    }
  }

  withdraw = (liquidity) => {
    if (a <= 0n || b <= 0n) throw new Error('Negative numbers')
    const aMain = (liquidity * this.A) / this._LIQUIDITY
    const bMain = (liquidity * this.B) / this._LIQUIDITY
    this.A = this.A - aMain
    this.B = this.B - bMain
    this.anchor.A = this.anchor.A - aMain
    this.anchor.B = this.anchor.B - bMain
    return { a: aMain, b: bMain }
  }

  _fee = (bidReserve, bidType, askType) => {
    return (
      ((bidReserve - this[`_${bidType}`]) ** 2n * this.anchor[askType]) /
      bidReserve ** 2n
    )
  }

  _tax = (amount) => {
    const tax = (amount * TAX) / BigInt.PRECISION
    return { tax, amount: amount - tax }
  }

  swap = (_amount, bidType = 'A', askType = 'B') => {
    // Tax
    const { tax, amount } = this._tax(_amount)
    // Bid reserve
    const prevBidReserve = this[bidType]
    const nextBidReserve = prevBidReserve + amount
    // Ask reserve
    const prevAskReserve = this[askType]
    const nextAskReserve = (prevBidReserve * prevAskReserve) / nextBidReserve
    // Ask amount & IL compensation
    const prevComp = this._fee(prevBidReserve, bidType, askType)
    const nextComp = this._fee(nextBidReserve, bidType, askType)
    console.log(prevComp, nextComp)
    const fee = nextComp - prevComp
    const askAmount = prevAskReserve - nextAskReserve - fee

    const prevPrice = Number(prevAskReserve) / Number(prevBidReserve)
    const nextPrice = Number(nextAskReserve) / Number(nextBidReserve)
    const anchorPrice =
      Number(this.anchor[askType]) / Number(this.anchor[bidType])
    console.log(
      'Price change',
      (Math.abs(nextPrice - prevPrice) / prevPrice) * 100,
      'Deviation',
      (Math.abs(nextPrice - anchorPrice) / anchorPrice) * 100,
    )
    console.log(
      'Fee',
      fee,
      (Number(fee) / Number(prevAskReserve - nextAskReserve)) * 100,
    )

    // History
    this[bidType] = nextBidReserve
    this[askType] = nextAskReserve
    this.record()
    // Return
    return askAmount
  }
}

module.exports = AMM
