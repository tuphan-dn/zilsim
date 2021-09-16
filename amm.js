require('./math')

const TAX = 500000000000000n

class AMM {
  constructor(A, B) {
    console.log(A, B)
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

  get alpha() {
    return (BigInt.PRECISION * this.A) / this.anchor.A
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

  _fee = (bidReserve, bidType, askType) => {
    return (
      ((bidReserve - this[`_${bidType}`]) ** 2n * this.anchor[askType]) /
      bidReserve ** 2n
    )
  }

  loop = (x, y, update, bidType = 'A', askType = 'B', step = 0) => {
    const newReserveBid = this[bidType] + x
    const newReserveAsk = (this[askType] * this[bidType]) / newReserveBid
    const alpha = (this[bidType] * BigInt.PRECISION) / newReserveBid
    const loss =
      ((BigInt.PRECISION - alpha) ** 2n * this.anchor[askType]) /
      BigInt.PRECISION ** 2n /
      2n
    const fee = loss > 1n ? loss : 1n
    if (!update) return { x, fee, y, step }
    if (fee * newReserveBid > y * newReserveAsk) {
      x = x - update
      y = y + update
      return this.loop(x, y, update / 2n, bidType, askType, ++step)
    } else if (fee * newReserveBid < y * newReserveAsk) {
      x = x + update
      y = y - update
      return this.loop(x, y, update / 2n, bidType, askType, ++step)
    } else {
      return { x, y, fee, step }
    }
  }

  swap = (amount, bidType = 'A', askType = 'B') => {
    // Compute propostion
    const { x, y, fee, step } = this.loop(
      amount,
      0n,
      amount / 2n,
      bidType,
      askType,
    )
    console.log(x, y, fee, step)
    // Bid/Ask reserve
    const prevBidReserve = this[bidType]
    const nextBidReserve = prevBidReserve + x
    const prevAskReserve = this[askType]
    const nextAskReserve = (prevBidReserve * prevAskReserve) / nextBidReserve
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
    this[bidType] = nextBidReserve + y
    this[askType] = nextAskReserve + fee
    this.anchor[bidType] =
      this.anchor[bidType] + (y * this.anchor[bidType]) / this[bidType]
    this.anchor[askType] =
      this.anchor[askType] + (fee * this.anchor[askType]) / this[askType]
    this.record()
    // Return
    return askAmount
  }
}

module.exports = AMM
