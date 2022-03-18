require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./SushiSwapPriceCalculator')
const UniSwapSingleSwap = require('./artifacts/contracts/UniSwapSingleSwap.sol/UniSwapSingleSwap.json')


const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const WETHABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]


let getPercentDifference = (price,price2) => {
    let higherPrice = (price >= price2) ? price : price2
    let lowerPrice = (price < price2) ? price : price2
    return 100-(lowerPrice/higherPrice)*100
}

let wrapEth = async (amount, wethContract) => {
    await wethContract.methods.deposit().send({from: process.env.ACCOUNT, value: web3.utils.toWei(amount.toString(), 'ether')})
}

let sendWrapEth = async(amount, to, wethContract) => {
    await wethContract.methods.transfer(to,web3.utils.toWei(amount.toString(), 'ether')).send({from: process.env.ACCOUNT})
}

let getWalletEthBalance = async (address) => {
    await web3.eth.getBalance(address, (err, wei) => {
        balance = web3.utils.fromWei(wei, 'ether')
        console.log(balance)
      })
}

const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))
let uniswapPriceCalc = new UniswapV3PriceCalculator(web3)
let sushiSwapPriceCalc = new SushiSwapPriceCalculator(web3)

const WETHContract = new web3.eth.Contract(WETHABI, WETH)
const WBTCContract = new web3.eth.Contract(WETHABI, WBTC)

let main = async () => {
    toAddress = '0x4bf010f1b9beDA5450a8dD702ED602A104ff65EE'
    let uniswapSingleSwapContract = new web3.eth.Contract(UniSwapSingleSwap['abi'], toAddress)
    await getWalletEthBalance(process.env.ACCOUNT)
    await wrapEth(15,WETHContract)
    await sendWrapEth(15,toAddress,WETHContract)
    try{
        await uniswapSingleSwapContract.methods.swapExactInputSingle(web3.utils.toWei('15','ether'),0,WETH,WBTC,500).send({from: process.env.ACCOUNT})
    } catch(error){
        console.log(error)
    }
    console.log(await WBTCContract.methods.balanceOf(process.env.ACCOUNT).call()/(10**8))
    await getWalletEthBalance(process.env.ACCOUNT)
    process.exit()
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