require('./math')
const numeral = require('numeral')

const FEE = 2500000000000000n
const TAX = 500000000000000n

class AMM {
  constructor(A, B) {
    this.A = A
    this.B = B
    this.liquidity = (A * B).sqrt()
    this.anchor = { A, B }
    // History
    this.history = []
    this.record()
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

  record = () => {
    const slice = {
      A: this.A,
      B: this.B,
      anchor: { ...this.anchor },
    }
    this.history.push(slice)
  }

  deposit = (a, b) => {
    if (a <= 0n || b <= 0n) throw new Error('Must be positive numbers')
    const c = (this.A * a) / this.anchor.A
    const d = (this.B * b) / this.anchor.B
    this.A = this.A + a
    this.B = this.B + b
    this.anchor.A = this.anchor.A + c
    this.anchor.B = this.anchor.B + d
    const lpt = (a * this.liquidity) / this.A
    return { lpt }
  }

  withdraw = (lpt) => {
    if (lpt) throw new Error('Must be positive numbers')
    const a = (lpt * this.A) / this.liquidity
    const b = (lpt * this.B) / this.liquidity
    const c = (a * this.anchor.A) / this.A
    const d = (b * this.anchor.B) / this.B
    this.A = this.A - a
    this.B = this.B - b
    this.anchor.A = this.anchor.A - c
    this.anchor.B = this.anchor.B - d
    return { a, b }
  }

  loop = (amount, bidFee, update, bidType = 'A', askType = 'B', step = 0) => {
    const bidAmount = amount - bidFee
    const newReserveBid = this[bidType] + bidAmount
    const newReserveAsk = (this[askType] * this[bidType]) / newReserveBid
    // [always] alpha > beta
    const alpha = (this.anchor[bidType] * BigInt.PRECISION) / this[bidType]
    const beta = (this.anchor[bidType] * BigInt.PRECISION) / newReserveBid
    const signed =
      (BigInt.PRECISION - beta) * (BigInt.PRECISION - alpha) >= 0n ? -1n : 1n
    console.log(
      Number(
        (
          (BigInt.PRECISION - beta) ** 2n +
          signed * (BigInt.PRECISION - alpha) ** 2n
        ).abs() / BigInt.PRECISION,
      ) / Number(BigInt.PRECISION),
    )
    const askFee =
      ((
        (BigInt.PRECISION - beta) ** 2n +
        signed * (BigInt.PRECISION - alpha) ** 2n
      ).abs() *
        this.anchor[askType]) /
      BigInt.PRECISION ** 2n /
      2n
    if (!update) return { bidAmount, bidFee, askFee }
    if (askFee * newReserveBid > bidFee * newReserveAsk) {
      bidFee = bidFee + update
      return this.loop(amount, bidFee, update / 2n, bidType, askType, ++step)
    } else if (askFee * newReserveBid < bidFee * newReserveAsk) {
      bidFee = bidFee - update
      return this.loop(amount, bidFee, update / 2n, bidType, askType, ++step)
    } else {
      return { bidAmount, bidFee, askFee }
    }
  }

  fee = (amount, bidType = 'A', askType = 'B') => {
    const { bidAmount, bidFee, askFee } = this.loop(
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

    const prevPrice = Number(prevAskReserve) / Number(prevBidReserve)
    const nextPrice = Number(nextAskReserve) / Number(nextBidReserve)
    const anchorPrice =
      Number(this.anchor[askType]) / Number(this.anchor[bidType])
    console.log(bidType, '→', askType)
    console.log(
      `Price Change: ${numeral(
        (Math.abs(nextPrice - prevPrice) / prevPrice) * 100,
      ).format('0.[000]')}%`,
      `\tDeviation: ${numeral(
        (Math.abs(nextPrice - anchorPrice) / anchorPrice) * 100,
      ).format('0.[000]')}%`,
    )
    console.log(
      'Bidfee',
      bidFee,
      `[${numeral((Number(bidFee) / Number(bidAmount + bidFee)) * 100).format(
        '0.[000]',
      )}%]`,
      'Askfee',
      askFee,
      `[${numeral((Number(askFee) / Number(askAmount + askFee)) * 100).format(
        '0.[000]',
      )}%]`,
    )
    // History
    this[bidType] = nextBidReserve + bidFee
    this[askType] = nextAskReserve + askFee
    this.anchor[bidType] = this.anchor[bidType] + bidFee
    this.anchor[askType] = this.anchor[askType] + askFee
    // this.anchor[bidType] =
    //   this.anchor[bidType] + (bidFee * this.anchor[bidType]) / this[bidType]
    // this.anchor[askType] =
    //   this.anchor[askType] + (askFee * this.anchor[askType]) / this[askType]
    this.record()
    // Return
    return askAmount
  }
}

module.exports = AMM
