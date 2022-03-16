require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./SushiSwapPriceCalculator')


const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))
let uniswapPriceCalc = new UniswapV3PriceCalculator(web3)
let sushiSwapPriceCalc = new SushiSwapPriceCalculator(web3)
let main = async () => {
    let {uniPrice, uniPrice2, uniPice3} = await uniswapPriceCalc.main()
    let {sushiPrice, sushiPrice2, sushiPrice3} = await sushiSwapPriceCalc.main()
    // results = await sushiSwapPriceCalc.getAllPairs()
    // for(key in results){
    //     console.log(key)
    // }
    process.exit()
}

main()