require('./math')
const AMM = require('./amm')
const { SwapBot } = require('./bot')

const decimals = 10n ** 9n
const A = 1000000000n * decimals
const B = 5000000000n * decimals
const velocity = BigInt.PRECISION / 1000000n

const amm = new AMM(A, B, velocity)
const bot = new SwapBot(A / 10000n, B / 10000n, amm)

const marketTrend = 0.65
let stop = 1000
console.log(amm.history[amm.history.length - 1])
while (stop-- > 0) {
  console.log('=======================================================')
  // Swap
  const returns = bot.swap(marketTrend)
  console.log('Returns:', returns)
  console.log(amm.history[amm.history.length - 1])
  // Estimate loss
  const { A: lastA, B: lastB } = amm.history[amm.history.length - 1]
  const hodl = (A * lastB) / lastA + B
  const depo = 2n * lastB
  const profit = depo - hodl
  console.log('Profit:', profit)
  console.log('Interest:', (Number(profit) / Number(hodl)) * 100)
}
