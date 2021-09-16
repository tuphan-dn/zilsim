require('./math')
const AMM = require('./amm')
const { SwapBot } = require('./bot')

const decimals = 10n ** 0n
const A = 1000000000n * decimals
const B = 5000000000n * decimals

const amm = new AMM(A, B)
const bot = new SwapBot(A, B, amm)

let stop = 1000
console.log(amm.history[amm.history.length - 1])
while (stop-- > 0) {
  console.log('=======================================================')
  // Swap
  const returns = bot.swap()
  console.log('Returns:', returns)
  console.log(amm.history[amm.history.length - 1])
  // Estimate loss
  const { A: lastA, B: lastB } = amm.history[amm.history.length - 1]
  const price = (lastB * BigInt.PRECISION) / lastA
  const hodl = (A * price) / BigInt.PRECISION + B
  const depo = 2n * lastB
  const loss = hodl - depo
  console.log('Loss:', loss)
  // if (loss > 100n) throw new Error(loss)
  // else console.log('Loss:', loss)
}
