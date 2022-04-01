require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./util/UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./util/SushiSwapPriceCalculator')
const AaveFlashLoan = require('./artifacts/contracts/AaveFlashLoanV3.sol/AaveFlashLoanV3.json')
const { WETH, WBTC, APE, ERC20ABI, UniPool1Address, UniPool2Address, UniPool3Address, SushiPair1Address, SushiPair2Address, SushiPair3Address, AaveFlashLoanAddress } = require('./EVMAddresses/evmAddresses')
const { default: BigNumber } = require('bignumber.js')
const {getPercentDifference, getTokenDirection, wrapToken, sendToken, getWalletEthBalance, getPolygonGasPrice} = require('./util/ArbitrageUtil')
const fs = require('fs')

const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))

let uniswapPriceCalc = new UniswapV3PriceCalculator(web3, UniPool1Address)
let uniswapPriceCalc2 = new UniswapV3PriceCalculator(web3, UniPool2Address)
let uniswapPriceCalc3 = new UniswapV3PriceCalculator(web3, UniPool3Address)

let sushiSwapPriceCalc = new SushiSwapPriceCalculator(web3, SushiPair1Address)
let sushiSwapPriceCalc2 = new SushiSwapPriceCalculator(web3, SushiPair2Address)
let sushiSwapPriceCalc3 = new SushiSwapPriceCalculator(web3, SushiPair3Address)

let uniPrice
let uniPrice2
let uniPrice3

let sushiPrice
let sushiPrice2
let sushiPrice3

let pair1Dif
let pair2Dif
let pair3Dif

const WETHContract = new web3.eth.Contract(ERC20ABI, WETH)
const WBTCContract = new web3.eth.Contract(ERC20ABI, WBTC)
const APEContract = new web3.eth.Contract(ERC20ABI, APE)

let loopCounter = 0
const AaveFlashLoanContract = new web3.eth.Contract(AaveFlashLoan.abi, AaveFlashLoanAddress)

let displayTokenInfo = () =>{
    console.table({           
        'UniSwap V3':{
            [uniswapPriceCalc.symbolsToString()]: uniPrice.toFixed(8),
            [uniswapPriceCalc2.symbolsToString()]: uniPrice2.toFixed(8),
            [uniswapPriceCalc3.symbolsToString()]: uniPrice3.toFixed(8)
        },
        'SushiSwap V2':{
            [sushiSwapPriceCalc.symbolsToString()]: sushiPrice.toFixed(8),
            [sushiSwapPriceCalc2.symbolsToString()]: sushiPrice2.toFixed(8),
            [sushiSwapPriceCalc3.symbolsToString()]: sushiPrice3.toFixed(8)
        },
        'Pair % Dif':{
            [uniswapPriceCalc.symbolsToString()]:  `${pair1Dif.toFixed(4)} %`,
            [uniswapPriceCalc2.symbolsToString()]: `${pair2Dif.toFixed(4)} %`,
            [uniswapPriceCalc3.symbolsToString()]: `${pair3Dif.toFixed(4)} %`
        }
    })
}

let  executeFlashLoan = async (token0, token1, direction, poolFee, amountToTrade, amountOut, deadline) => {
    displayTokenInfo()
    try{
        await AaveFlashLoanContract.methods.myFlashLoanCall(token0,token1,direction,poolFee,amountToTrade.toString(),amountOut.toString(),deadline).send({
            from: process.env.ACCOUNT,
            gasPrice: await getPolygonGasPrice('fast')
        })
    }catch(error){
        console.log('Flash Loan execution error')
        console.log(error)
        process.exit()
    }
}

let tokenWithdraw = async(token0) => {
    try{
        await AaveFlashLoanContract.methods.withdrawERC20Token(token0).send({
            from: process.env.ACCOUNT,
            gasPrice: await getPolygonGasPrice('standard')
        })
    }catch(error){
        console.log('Token withdraw error')
        console.log(error)
        process.exit()
    }
}

let main = async () => {
    if (isPolling == false){

        isPolling = true
        try{
            uniPrice = await uniswapPriceCalc.getPairPrice()
            uniPrice2 = await uniswapPriceCalc2.getPairPrice()
            uniPrice3 = await uniswapPriceCalc3.getPairPrice()

            sushiPrice = await sushiSwapPriceCalc.getPairPrice()
            sushiPrice2 = await sushiSwapPriceCalc2.getPairPrice()
            sushiPrice3 = await sushiSwapPriceCalc3.getPairPrice()

            pair1Dif = getPercentDifference(uniPrice, sushiPrice)
            pair2Dif = getPercentDifference(uniPrice2,sushiPrice2)
            pair3Dif = getPercentDifference(uniPrice3,sushiPrice3)

            // console.log(uniswapPriceCalc.getOriginalPrice().toString())
            
            // console.log(uniswapPriceCalc2.getOriginalPrice().toString())
            
            // console.log(uniswapPriceCalc3.getOriginalPrice().toString())
        }catch(error){
            console.log(error)
        }

        if(loopCounter%10==0){
            displayTokenInfo()
        }
        if(pair1Dif >= 1.5){
            console.log('pair1')
            let direction = getTokenDirection(uniPrice,sushiPrice)
            console.log(direction)
            let amountToTrade = BigNumber(1).shiftedBy(parseInt(uniswapPriceCalc.token0Decimals)).toString()
            console.log(amountToTrade)
            await executeFlashLoan(uniswapPriceCalc.token0Trade,uniswapPriceCalc.token1Trade,direction,uniswapPriceCalc.poolFee,amountToTrade,0,50000000000)
            await tokenWithdraw(uniswapPriceCalc.token0Trade)
            process.exit()
        }
        if(pair2Dif >= 1.5){
            console.log('pair2')
            let direction = getTokenDirection(uniPrice,sushiPrice)
            console.log(direction)
            let amountToTrade = BigNumber(1).shiftedBy(parseInt(uniswapPriceCalc2.token0Decimals)).toString()
            console.log(amountToTrade)
            await executeFlashLoan(uniswapPriceCalc2.token0Trade,uniswapPriceCalc2.token1Trade,direction,uniswapPriceCalc2.poolFee,amountToTrade,0,50000000000)
            await tokenWithdraw(uniswapPriceCalc2.token0Trade)
            process.exit()
        }
        if(pair3Dif >= 1.5){
            console.log('pair3')
            let direction = getTokenDirection(uniPrice3,sushiPrice3)
            console.log(direction)
            let amountToTrade = BigNumber(1).shiftedBy(parseInt(uniswapPriceCalc3.token0Decimals)).toString()
            console.log(amountToTrade)
            await executeFlashLoan(uniswapPriceCalc3.token0Trade,uniswapPriceCalc3.token1Trade,direction,uniswapPriceCalc3.poolFee,amountToTrade,0,50000000000)
            await tokenWithdraw(uniswapPriceCalc3.token0Trade)
            process.exit()
        }

        fs.writeFileSync('./tmp/healthcheck.log','running')
        isPolling = false
        loopCounter += 1
    }
}

let priceMonitor
let isPolling = false
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => { await main() }, POLLING_INTERVAL)