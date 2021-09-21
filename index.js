require('./math')
const AMM = require('./amm')
const { SwapBot } = require('./bot')

const decimals = 10n ** 0n
const A = 1000000000n * decimals
const B = 5000000000n * decimals
const interests = (10n * BigInt.PRECISION) / 100n // 4%

const amm = new AMM(A, B, interests)
const bot = new SwapBot(A / 1000n, B / 1000n, amm)

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
  const hodl = (A * amm.B) / amm.A + B
  const depo = 2n * amm.B
  const profit = depo - hodl
  console.log('Profit:', profit)
  console.log('Interest:', (Number(profit) / Number(hodl)) * 100)
}
console.log('Bid')
amm.stat.get('bid')
console.log('Ask')
amm.stat.get('ask')
