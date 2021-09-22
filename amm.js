require('./math')
const numeral = require('numeral')
const Stat = require('./stat')

const FEE = 1000000000000000n
const TAX = 500000000000000n

class AMM {
  constructor(A, B) {
    this.A = A
    this.B = B
    this.liquidity = this._liquidity(A, B)
    this.anchor = { A, B }
    this.origin = { A, B }
    this.discount = 2n
    // History
    this.history = []
    this.record()
    this.stat = new Stat()
  }

  record = () => {
    const slice = {
      A: this.A,
      B: this.B,
      anchor: { ...this.anchor },
    }
    this.history.push(slice)
  }

  _liquidity = (a, b) => {
    return (a * b).sqrt()
  }

  // Precision: BigInt.PRECISION = 10^18
  _deviate = (A, B, anchorA, anchorB) => {
    const anchorPrice = (anchorB * BigInt.PRECISION) / anchorA
    const currentPrice = (B * BigInt.PRECISION) / A
    return ((currentPrice * BigInt.PRECISION ** 2n) / anchorPrice).sqrt()
  }

  deposit = (a, b, updated = true) => {
    if (a < 0n || b < 0n) throw new Error('Must be positive numbers')
    const alpha = this._deviate(this.A, this.B, this.anchor.A, this.anchor.B)
    const c = (a * alpha) / BigInt.PRECISION
    const d = (b * BigInt.PRECISION) / alpha
    this.A = this.A + a
    this.B = this.B + b
    this.anchor.A = this.anchor.A + c
    this.anchor.B = this.anchor.B + d
    const lpt = this._liquidity(c, d)
    if (updated) this.liquidity = this.liquidity + lpt
    return { lpt }
  }

  withdraw = (lpt) => {
    if (lpt < 0n) throw new Error('Must be positive numbers')
    const a = (lpt * this.A) / this.liquidity
    const b = (lpt * this.B) / this.liquidity
    const c = (lpt * this.anchor.A) / this.liquidity
    const d = (lpt * this.anchor.B) / this.liquidity
    this.A = this.A - a
    this.B = this.B - b
    this.anchor.A = this.anchor.A - c
    this.anchor.B = this.anchor.B - d
    this.liquidity = this.liquidity - lpt
    return { a, b }
  }

  adaptive = (
    amount,
    bidFee,
    update,
    bidType = 'A',
    askType = 'B',
    step = 0,
  ) => {
    const bidAmount = amount - bidFee
    const newReserveBid = this[bidType] + bidAmount
    const newReserveAsk = (this[askType] * this[bidType]) / newReserveBid
    const askAmount = this[askType] - newReserveAsk
    // [always] alpha > beta
    const alpha = this._deviate(
      this[bidType],
      this[askType],
      this.anchor[bidType],
      this.anchor[askType],
    )
    const beta = this._deviate(
      newReserveBid,
      newReserveAsk,
      this.anchor[bidType],
      this.anchor[askType],
    )
    const signed =
      (BigInt.PRECISION - beta) * (BigInt.PRECISION - alpha) >= 0n ? -1n : 1n
    const comp =
      ((
        (BigInt.PRECISION - beta) ** 2n +
        signed * (BigInt.PRECISION - alpha) ** 2n
      ).abs() *
        this.anchor[askType]) /
      BigInt.PRECISION ** 2n /
      this.discount
    const minComp = ((askAmount * FEE) / BigInt.PRECISION).max(1n)
    const askFee = comp > minComp ? comp : minComp
    if (!update) return { bidAmount, bidFee, askFee }
    if (askFee * newReserveBid > bidFee * newReserveAsk) {
      bidFee = bidFee + update
      return this.adaptive(
        amount,
        bidFee,
        update / 2n,
        bidType,
        askType,
        ++step,
      )
    } else if (askFee * newReserveBid < bidFee * newReserveAsk) {
      bidFee = bidFee - update
      return this.adaptive(
        amount,
        bidFee,
        update / 2n,
        bidType,
        askType,
        ++step,
      )
    } else {
      return { bidAmount, bidFee, askFee }
    }
  }

  fee = (amount, bidType = 'A', askType = 'B') => {
    const profit =
      2n * this[askType] -
      (this.origin[bidType] * this[askType]) / this[bidType] -
      this.origin[askType]
    console.log(profit)
    if (profit > 0) this.discount = (this.discount * 2n).min(1024n)
    if (profit < 0) this.discount = (this.discount / 2n).max(2n)
    const { bidAmount, bidFee, askFee } = this.adaptive(
      amount,
      0n,
      amount / 2n,
      bidType,
      askType,
    )
    return { bidAmount, bidFee, askFee }
  }

  swap = (amount, bidType = 'A', askType = 'B') => {
    // Compute propostion
    const { bidAmount, bidFee, askFee } = this.fee(amount, bidType, askType)
    // Bid & Ask reserve
    const prevBidReserve = this[bidType]
    const nextBidReserve = prevBidReserve + bidAmount
    const prevAskReserve = this[askType]
    const nextAskReserve = (prevBidReserve * prevAskReserve) / nextBidReserve
    const askAmount = prevAskReserve - nextAskReserve - askFee
    const fee = this.stat.set(bidFee, bidAmount, askFee, askAmount)

    const prevPrice = Number(prevAskReserve) / Number(prevBidReserve)
    const nextPrice = Number(nextAskReserve) / Number(nextBidReserve)
    const anchorPrice =
      Number(this.anchor[askType]) / Number(this.anchor[bidType])
    console.log(this.discount)
    console.log(bidType, '→', askType)
    console.log(
      'Previous Price:',
      prevPrice,
      'Next Price:',
      nextPrice,
      'Anchor Price:',
      anchorPrice,
    )
    console.log(
      `Price Change: ${numeral(
        (Math.abs(nextPrice - prevPrice) / prevPrice) * 100,
      ).format('0.[000]')}%`,
      `\tDeviation: ${numeral(
        (Math.abs(nextPrice - anchorPrice) / anchorPrice) * 100,
      ).format('0.[000]')}%`,
      `\tFee: ${numeral(fee).format('0.[000]')}%`,
    )
    // History
    this[bidType] = nextBidReserve
    this[askType] = nextAskReserve
    if (bidType === 'A') this.deposit(bidFee, askFee, false)
    else this.deposit(askFee, bidFee, false)
    this.record()
    // Return
    return askAmount
  }
}

module.exports = AMM
