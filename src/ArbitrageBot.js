require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./SushiSwapPriceCalculator')


const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'

let getPercentDifference = (price,price2) => {
    let higherPrice = (price >= price2) ? price : price2
    let lowerPrice = (price < price2) ? price : price2
    return 100-(lowerPrice/higherPrice)*100
}

const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))
let uniswapPriceCalc = new UniswapV3PriceCalculator(web3)
let sushiSwapPriceCalc = new SushiSwapPriceCalculator(web3)

let main = async () => {
    if (isPolling == false){

        isPolling = true

        let {uniPrice, uniPrice2, uniPrice3} = await uniswapPriceCalc.main()
        let {sushiPrice, sushiPrice2, sushiPrice3} = await sushiSwapPriceCalc.main()

        let pair1 = getPercentDifference(uniPrice,sushiPrice)
        let pair2 = getPercentDifference(uniPrice2,sushiPrice2)
        let pair3 = getPercentDifference(uniPrice3,sushiPrice3)

        if(pair1 >= 1){
            console.log('Trade should execute for pair WETH/WBTC')
            process.exit()
        }
        if(pair2 >= 1){
            console.log('Trade should execute for pair USDT/WETH')
            process.exit()
        }
        if(pair3 >= 1){
            console.log('Trade should execute for pair USDT/WBTC')
            process.exit()
        }
        console.log(pair1)
        console.log(pair2)
        console.log(pair3)

        isPolling = false
    }
    // results = await sushiSwapPriceCalc.getAllPairs()
    // for(key in results){
    //     console.log(key)
    // }
}

let priceMonitor
let isPolling = false
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => { await main() }, POLLING_INTERVAL)