const numeral = require('numeral')

const DIVISION = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

class Stat {
  constructor() {
    this.data = [...DIVISION]
  }

  infer = (percentage) => {
    const re = [...DIVISION]
    if (0 <= percentage && percentage < 0.05) re[0] = 1
    else if (0.05 <= percentage && percentage < 0.1) re[1] = 1
    else if (0.1 <= percentage && percentage < 0.15) re[2] = 1
    else if (0.15 <= percentage && percentage < 0.2) re[3] = 1
    else if (0.2 <= percentage && percentage < 0.25) re[4] = 1
    else if (0.25 <= percentage && percentage < 0.3) re[5] = 1
    else if (0.3 <= percentage && percentage < 0.35) re[6] = 1
    else if (0.35 <= percentage && percentage < 0.4) re[7] = 1
    else if (0.4 <= percentage && percentage < 0.45) re[8] = 1
    else if (0.45 <= percentage && percentage < 0.5) re[9] = 1
    else if (0.5 <= percentage && percentage < 0.55) re[10] = 1
    else if (0.55 <= percentage && percentage < 0.6) re[11] = 1
    else if (0.6 <= percentage && percentage < 0.65) re[12] = 1
    else if (0.65 <= percentage && percentage < 0.7) re[13] = 1
    else if (0.7 <= percentage && percentage < 0.75) re[14] = 1
    else if (0.75 <= percentage && percentage < 0.8) re[15] = 1
    else if (0.8 <= percentage && percentage < 0.85) re[16] = 1
    else if (0.85 <= percentage && percentage < 0.9) re[17] = 1
    else if (0.9 <= percentage && percentage < 0.95) re[18] = 1
    else if (0.95 <= percentage && percentage < 1) re[19] = 1
    else re[20] = 1
    return re
  }

  set = (bidFee, bidAmount, askFee, askAmount) => {
    const bidPercentage = Number(bidFee) / Number(bidAmount + bidFee)
    const askPercentage = Number(askFee) / Number(askAmount + askFee)
    const percentage = (1 - (1 - bidPercentage) * (1 - askPercentage)) * 100
    this.infer(percentage).forEach((value, index) => {
      this.data[index] = this.data[index] + value
    })
    return percentage
  }

  get = () => {
    let sum = 0
    let low = 0
    this.data.forEach((value, index) => {
      sum = sum + value
      if ((index + 1) * 0.05 <= 0.3) low = low + value
      console.log(
        `% ${numeral(index * 0.05).format('0.00')} - ${
          (index + 1) * 0.05 > 1
            ? '...'
            : numeral((index + 1) * 0.05).format('0.[00]')
        }:`,
        value,
      )
    })
    console.log(`${low}/${sum} %`, (low / sum) * 100)
  }
}

module.exports = Stat
