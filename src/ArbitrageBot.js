require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./util/UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./util/SushiSwapPriceCalculator')
const AaveFlashLoan = require('./artifacts/contracts/AaveFlashLoanV3.sol/AaveFlashLoanV3.json')
const { WETH, WBTC, APE, ERC20ABI, UniWETHtoWBTCPoolAddress, UniWETHtoUSDTPoolAddress, UniAPEToWETHPoolAddress, SushiWETHtoWBTCPairAddress, SushiWETHtoUSDTPairAddress, SushiAPEtoWETHPairAddress, AaveFlashLoanAddress } = require('./EVMAddresses/evmAddresses')
const { default: BigNumber } = require('bignumber.js')
const {getPercentDifference, getTokenDirection, wrapToken, sendToken, getWalletEthBalance} = require('./util/ArbitrageUtil')


const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))

let uniswapPriceCalc = new UniswapV3PriceCalculator(web3, UniWETHtoWBTCPoolAddress)
let uniswapPriceCalc2 = new UniswapV3PriceCalculator(web3, UniWETHtoUSDTPoolAddress)
let uniswapPriceCalc3 = new UniswapV3PriceCalculator(web3, UniAPEToWETHPoolAddress)

let sushiSwapPriceCalc = new SushiSwapPriceCalculator(web3, SushiWETHtoWBTCPairAddress)
let sushiSwapPriceCalc2 = new SushiSwapPriceCalculator(web3, SushiWETHtoUSDTPairAddress)
let sushiSwapPriceCalc3 = new SushiSwapPriceCalculator(web3, SushiAPEtoWETHPairAddress)

const WETHContract = new web3.eth.Contract(ERC20ABI, WETH)
const WBTCContract = new web3.eth.Contract(ERC20ABI, WBTC)
const APEContract = new web3.eth.Contract(ERC20ABI, APE)

const AaveFlashLoanContract = new web3.eth.Contract(AaveFlashLoan.abi, AaveFlashLoanAddress)

let main = async () => {
    if (isPolling == false){

        isPolling = true

        let uniPrice = await uniswapPriceCalc.getPairPrice()
        let uniPrice2 = await uniswapPriceCalc2.getPairPrice()
        let uniPrice3 = await uniswapPriceCalc3.getPairPrice()

        let sushiPrice = await sushiSwapPriceCalc.getPairPrice()
        let sushiPrice2 = await sushiSwapPriceCalc2.getPairPrice()
        let sushiPrice3 = await sushiSwapPriceCalc3.getPairPrice()
        console.log('-------------------------------Uniswap V3--------------------------------------')
        console.log(`WETH/WBTC: ${uniPrice.toFixed(8)} | USDT/WETH: ${uniPrice2.toFixed(8)} | APE/WETH: ${uniPrice3.toFixed(8)}`)
        console.log('-------------------------------------------------------------------------------')
        console.log('------------------------------SushiSwap V2-------------------------------------')
        console.log(`WETH/WBTC: ${sushiPrice.toFixed(8)} | USDT/WETH: ${sushiPrice2.toFixed(8)} | APE/WETH ${sushiPrice3.toFixed(8)}`)
        console.log('-------------------------------------------------------------------------------')
        // let pair1 = getPercentDifference(uniPrice,sushiPrice)
        // let pair2 = getPercentDifference(uniPrice2,sushiPrice2)
        // let pair3 = getPercentDifference(uniPrice3,sushiPrice3)
        // console.log(pair1)
        // console.log(pair2)
        // console.log(pair3)
        process.exit()
        if(pair1 >= .5){
            console.log(pair1)
            let direction = getTokenDirection(uniPrice,sushiPrice)
            console.log(direction)
            process.exit()
        }
        if(pair2 >= .5){
            console.log(pair2)
            let direction = getTokenDirection(uniPrice,sushiPrice)
            console.log(direction)
            process.exit()
        }
        if(pair3 >= 1){
            let wethAmountToTransfer = 20
            try{
                await wrapToken(wethAmountToTransfer,process.env.ACCOUNT)
            }catch(error){
                console.log(error)
                process.exit()
            }
            await sendToken(wethAmountToTransfer, AaveFlashLoanAddress, process.env.ACCOUNT, WETHContract)
            let wethBalBefore = await WETHContract.methods.balanceOf(AaveFlashLoanAddress).call()
            console.log(wethBalBefore)
            let direction = getTokenDirection(uniPrice3,sushiPrice3)
            console.log(direction)
            let amountToTrade = BigNumber(1).shiftedBy(18).toString()
            try{
                await AaveFlashLoanContract.methods.myFlashLoanCall(WETH,WBTC,direction,500,amountToTrade,0,50000000000).send({from: process.env.ACCOUNT})
            }catch(error){
                console.log(error)
                process.exit()
            }
            try{
                await AaveFlashLoanContract.methods.withdrawERC20Token(WETH).send({from: process.env.ACCOUNT})
            }catch(error){
                console.log(error)
                process.exit()
            }
            let wethBal = await WETHContract.methods.balanceOf(process.env.ACCOUNT).call()
            console.log(wethBal)
            let amountMade = wethBal-wethBalBefore
            console.log(amountMade)
            process.exit()
        }


        isPolling = false
    }
}

let priceMonitor
let isPolling = false
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => { await main() }, POLLING_INTERVAL)