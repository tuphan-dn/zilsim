require('./math')
const numeral = require('numeral')
const Stat = require('./stat')

const FEE = 1000000000000000n
const TAX = 1000000000000000n

class AMM {
  constructor(A, B) {
    this.A = A
    this.B = B
    this.liquidity = (A * B).sqrt()
    // History
    this.history = []
    this.record()
    this.stat = new Stat()
  }

  record = () => {
    const slice = { A: this.A, B: this.B }
    this.history.push(slice)
  }

  // Precision: BigInt.PRECISION = 10^18
  _deviate = (A, B, anchorA, anchorB) => {
    const anchorPrice = (anchorB * BigInt.PRECISION) / anchorA
    const currentPrice = (B * BigInt.PRECISION) / A
    return ((currentPrice * BigInt.PRECISION ** 2n) / anchorPrice).sqrt()
  }

  deposit = (a, b) => {
    if (a < 0n || b < 0n) throw new Error('Must be positive numbers')
    this.A = this.A + a
    this.B = this.B + b
    const lpt = (a * this.liquidity) / this.A
    this.liquidity = this.liquidity + lpt
    return { lpt }
  }

  withdraw = (lpt) => {
    if (lpt < 0n) throw new Error('Must be positive numbers')
    const a = (lpt * this.A) / this.liquidity
    const b = (lpt * this.B) / this.liquidity
    this.A = this.A - a
    this.B = this.B - b
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
    const alpha = this._deviate(
      newReserveBid,
      newReserveAsk,
      this[bidType],
      this[askType],
    )
    const askFee =
      ((BigInt.PRECISION - alpha) ** 2n * this[askType]) /
      BigInt.PRECISION ** 2n / 2n
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
    console.log(bidType, '→', askType)
    console.log('Previous Price:', prevPrice, 'Next Price:', nextPrice)
    console.log(
      `Price Change: ${numeral(
        (Math.abs(nextPrice - prevPrice) / prevPrice) * 100,
      ).format('0.[000]')}%`,
      `\tFee: ${numeral(fee).format('0.[000]')}%`,
    )
    // History
    this[bidType] = nextBidReserve + bidFee
    this[askType] = nextAskReserve + askFee
    this.record()
    // Return
    return askAmount
  }
}

module.exports = AMM
