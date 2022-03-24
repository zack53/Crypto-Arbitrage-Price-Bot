require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./SushiSwapPriceCalculator')
const AaveFlashLoan = require('./artifacts/contracts/AaveFlashLoan.sol/AaveFlashLoan.json')
const UniSwapSingleSwap = require('./artifacts/contracts/UniSwapSingleSwap.sol/UniSwapSingleSwap.json')
const SushiSwapSingleSwap = require('./artifacts/contracts/SushiSwapSingleSwap.sol/SushiSwapSingleSwap.json')

const { default: BigNumber } = require('bignumber.js')

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const WETHABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]


let getPercentDifference = (price,price2) => {
    let higherPrice = (price >= price2) ? price : price2
    let lowerPrice = (price < price2) ? price : price2
    return 100-(lowerPrice/higherPrice)*100
}

let getTokenDirection = (uniSwapPrice,sushiSwapPrice) => {
    //Assuming uniswap is first price
    let direction = (uniSwapPrice >= sushiSwapPrice) ? 1 : 0
    return direction
}

let wrapEth = async (amount, _from) => {
    await WETHContract.methods.deposit().send({from: _from, value: web3.utils.toWei(amount.toString(), 'ether')})
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
let sushiSwapSingleSwapTokens = async (amountIn, amountOutMin, token0, token1, deadline) =>{
    if(token0 != WETH){
    }
    let tokenContract = new web3.eth.Contract(WETHABI, token0)
    let token1Contract = new web3.eth.Contract(WETHABI, token1)
    
    let tokenDecimal = await getTokenDecimal(tokenContract)
    let amountAdj = BigNumber(amountIn).shiftedBy(tokenDecimal).toString()
    let token1Decimal = await getTokenDecimal(token1Contract)
    let amountOutMinAdj = (amountOutMin != 0) ? BigNumber(amountOutMin).shiftedBy(token1Decimal).toString() : '0'
    let currentBalBefore = await token1Contract.methods.balanceOf(process.env.ACCOUNT).call()
    await tokenContract.methods.approve(SushiSwapSingleSwapAddress, amountAdj).send({from: process.env.ACCOUNT})
    await SushiSwapSingleSwapContract.methods.swapExactInputSingle(amountAdj,amountOutMinAdj,[token0,token1],process.env.ACCOUNT,deadline).send({from: process.env.ACCOUNT})

    let currentBal = await token1Contract.methods.balanceOf(process.env.ACCOUNT).call()
    return BigNumber(currentBal-currentBalBefore).shiftedBy(-1*token1Decimal)
}

let getTokenDecimal = async (tokenContract) => {
    return parseInt(await tokenContract.methods.decimals().call())
}
let uniSwapSingleSwapTokens = async (amountIn, amountOutMin, token0, token1, poolFee) =>{
    if(token0 != WETH){
    }
    let tokenContract = new web3.eth.Contract(WETHABI, token0)
    let token1Contract = new web3.eth.Contract(WETHABI, token1)

    let tokenDecimal = await getTokenDecimal(tokenContract)
    let amountAdj = BigNumber(amountIn).shiftedBy(tokenDecimal).toString()
    let token1Decimal = await getTokenDecimal(token1Contract)
    let amountOutMinAdj = (amountOutMin != 0) ? BigNumber(amountOutMin).shiftedBy(token1Decimal).toString() : '0'
    //Approve withdrawl of WETH to the contract to be able to pay premium fee during test.
    let currentBalBefore = await token1Contract.methods.balanceOf(process.env.ACCOUNT).call()
    await tokenContract.methods.approve(UniSwapSingleSwapAddress, amountAdj).send({from: process.env.ACCOUNT})
    await UniSwapSingleSwapContract.methods.swapExactInputSingle(amountAdj, amountOutMinAdj, token0, token1, poolFee).send({from: process.env.ACCOUNT})

    let currentBal = await token1Contract.methods.balanceOf(process.env.ACCOUNT).call()
    return BigNumber(currentBal-currentBalBefore).shiftedBy(-1*token1Decimal)
}
const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))
let uniswapPriceCalc = new UniswapV3PriceCalculator(web3)
let sushiSwapPriceCalc = new SushiSwapPriceCalculator(web3)

const WETHContract = new web3.eth.Contract(WETHABI, WETH)
const WBTCContract = new web3.eth.Contract(WETHABI, WBTC)

const AaveFlashLoandAddress = '0x4bf010f1b9beDA5450a8dD702ED602A104ff65EE'
const AaveFlashLoanContract = new web3.eth.Contract(AaveFlashLoan.abi, AaveFlashLoandAddress)

const UniSwapSingleSwapAddress = '0x40a42Baf86Fc821f972Ad2aC878729063CeEF403'
const UniSwapSingleSwapContract = new web3.eth.Contract(UniSwapSingleSwap.abi, UniSwapSingleSwapAddress)

const SushiSwapSingleSwapAddress = '0x96F3Ce39Ad2BfDCf92C0F6E2C2CAbF83874660Fc'
const SushiSwapSingleSwapContract = new web3.eth.Contract(SushiSwapSingleSwap.abi, SushiSwapSingleSwapAddress)
let main = async () => {
    if (isPolling == false){

        isPolling = true

        let {uniPrice, uniPrice2, uniPrice3} = await uniswapPriceCalc.main()
        let {sushiPrice, sushiPrice2, sushiPrice3} = await sushiSwapPriceCalc.main()

        let pair1 = getPercentDifference(uniPrice,sushiPrice)
        let pair2 = getPercentDifference(uniPrice2,sushiPrice2)
        let pair3 = getPercentDifference(uniPrice3,sushiPrice3)

        
        //Wrap some ETH to be used for trading.
        let wethAmountToTransfer = 30
        await wrapEth(wethAmountToTransfer,process.env.ACCOUNT)

        let amountOut = await uniSwapSingleSwapTokens(1,0,WETH,WBTC,500)
        let amountOutSushi = await sushiSwapSingleSwapTokens(amountOut,0,WBTC,WETH,5000000000)
        console.log(amountOut.toFixed(8))
        console.log(amountOutSushi.toFixed(8))
        //console.log(amountOutSushi.minus(amountOut).toFixed(8))

        process.exit()
        // if(pair1 >= 1){
        //     console.log('Trade should execute for pair WETH/WBTC')
        //     console.log(pair1)
        //     process.exit()
        // }
        // if(pair2 >= 1){
        //     console.log('Trade should execute for pair USDT/WETH')
        //     console.log(pair2)
        //     process.exit()
        // }
        // if(pair3 >= 1){
        //     console.log('Trade should execute for pair USDT/WBTC')
        //     console.log(pair3)
        //     let direction = getTokenDirection(uniPrice3, sushiPrice3)
        //     let wbtcDecimal = await WBTCContract.methods.decimals().call()
        //     let amountTOTrade = BigNumber(1).shiftedBy(parseInt(wbtcDecimal))
        //     let wethAmountToTransfer = 30
        //     //Send ETH to WETH contract in return for WETH
        //     await wrapEth(wethAmountToTransfer,process.env.ACCOUNT)
        //     let wethToTrade = web3.utils.toWei(wethAmountToTransfer.toString(),'ether')
        //     //Approve withdrawl of WETH to the contract to be able to pay premium fee during test.
        //     await WETHContract.methods.approve(UniSwapSingleSwapAddress, wethToTrade).send({from: process.env.ACCOUNT})
        //     await UniSwapSingleSwapContract.methods.swapExactInputSingle(wethToTrade, 0, WETH, WBTC, 500).send({from: process.env.ACCOUNT})
        //     let wbtcBalBefore = await WBTCContract.methods.balanceOf(process.env.ACCOUNT).call()
        //     await WBTCContract.methods.transfer(AaveFlashLoandAddress, wbtcBalBefore).send({from: process.env.ACCOUNT})
        //     console.log(wbtcBalBefore)
        //     try{
        //         await AaveFlashLoanContract.methods.myFlashLoanCall(WBTC,USDT,direction,3000,amountTOTrade,0,5000000000).send({from: process.env.ACCOUNT})
        //     }catch(error){
        //         console.log(error)
        //     }
        //     await AaveFlashLoanContract.methods.withdrawERC20Token(WBTC).send({from: process.env.ACCOUNT})
        //     let wbtcBal = await WBTCContract.methods.balanceOf(process.env.ACCOUNT).call()
        //     console.log(wbtcBal)
        //     let amountMade = (wbtcBal-wbtcBalBefore)/10**8
        //     console.log(amountMade)
        //     process.exit()
        // }

        isPolling = false
    }
}

let priceMonitor
let isPolling = false
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => { await main() }, POLLING_INTERVAL)