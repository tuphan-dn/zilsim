require('./math')
const numeral = require('numeral')

const FEE = 1000000000000000n
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

  record = () => {
    const slice = {
      A: this.A,
      B: this.B,
      anchor: { ...this.anchor },
    }
    this.history.push(slice)
  }

  deposit = (a, b) => {
    if (a < 0n || b < 0n) throw new Error('Must be positive numbers')
    this.A = this.A + a
    this.B = this.B + b
    this.anchor.A = this.anchor.A + a
    this.anchor.B = this.anchor.B + b
    const lpt = (a * this.liquidity) / this.A
    return { lpt }
  }

  withdraw = (lpt) => {
    if (lpt < 0n) throw new Error('Must be positive numbers')
    const a = (lpt * this.A) / this.liquidity
    const b = (lpt * this.B) / this.liquidity
    this.A = this.A - a
    this.B = this.B - b
    this.anchor.A = this.anchor.A - (lpt * this.anchor.A) / this.liquidity
    this.anchor.B = this.anchor.B - (lpt * this.anchor.B) / this.liquidity
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
    // [always] alpha > beta
    const alpha = (this.anchor[bidType] * BigInt.PRECISION) / this[bidType]
    const beta = (this.anchor[bidType] * BigInt.PRECISION) / newReserveBid
    const signed =
      (BigInt.PRECISION - beta) * (BigInt.PRECISION - alpha) >= 0n ? -1n : 1n
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

    const prevPrice = Number(prevAskReserve) / Number(prevBidReserve)
    const nextPrice = Number(nextAskReserve) / Number(nextBidReserve)
    const anchorPrice =
      Number(this.anchor[askType]) / Number(this.anchor[bidType])
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
    this[bidType] = nextBidReserve
    this[askType] = nextAskReserve
    this.deposit(bidFee, askFee)
    this.record()
    // Return
    return askAmount
  }
}

module.exports = AMM
