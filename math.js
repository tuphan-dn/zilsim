/**
 * Precision
 */
BigInt.PRECISION = 10n ** 18n

/**
 * Square root for u128
 */
BigInt.prototype.sqrt = function () {
  if (this > 2n ** 128n - 1n) throw new Error('Exceed limit')
  if (this < 2n) return this
  let bits = (BigInt(this.toString(2).length) + 1n) / 2n
  let start = 1n << (bits - 1n)
  let end = 1n << (bits + 1n)
  while (start < end) {
    end = (start + end) / 2n
    start = this / end
  }
  return end
}

/**
 * Random a big integer less than this
 */
BigInt.prototype.less = function () {
  const rand = BigInt(Math.floor(Number(BigInt.PRECISION) * Math.random()))
  return (this * rand) / BigInt.PRECISION
}

/**
 * Absolution
 */
BigInt.prototype.abs = function () {
  if (this < 0n) return this * -1n
  return this.valueOf()
}
