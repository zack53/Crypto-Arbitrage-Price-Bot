require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./SushiSwapPriceCalculator')
const AaveFlashLoan = require('./artifacts/contracts/AaveFlashLoan.sol/AaveFlashLoan.json')
const UniSwapSingleSwap = require('./artifacts/contracts/UniSwapSingleSwap.sol/UniSwapSingleSwap.json')
const SushiSwapSingleSwap = require('./artifacts/contracts/SushiSwapSingleSwap.sol/SushiSwapSingleSwap.json')
const { WETH, WBTC, APE, ERC20ABI } = require('./EVMAddresses/ethMainnetAddresses')
const { default: BigNumber } = require('bignumber.js')




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

let sendToken = async(amount, to, tokenContract) => {
    await tokenContract.methods.transfer(to,web3.utils.toWei(amount.toString(), 'ether')).send({from: process.env.ACCOUNT})
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
    let tokenContract = new web3.eth.Contract(ERC20ABI, token0)
    let token1Contract = new web3.eth.Contract(ERC20ABI, token1)
    
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
    let tokenContract = new web3.eth.Contract(ERC20ABI, token0)
    let token1Contract = new web3.eth.Contract(ERC20ABI, token1)

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

const WETHContract = new web3.eth.Contract(ERC20ABI, WETH)
const WBTCContract = new web3.eth.Contract(ERC20ABI, WBTC)
const APEContract = new web3.eth.Contract(ERC20ABI, APE)

const AaveFlashLoandAddress = '0x40a42Baf86Fc821f972Ad2aC878729063CeEF403'
const AaveFlashLoanContract = new web3.eth.Contract(AaveFlashLoan.abi, AaveFlashLoandAddress)

const UniSwapSingleSwapAddress = '0x96F3Ce39Ad2BfDCf92C0F6E2C2CAbF83874660Fc'
const UniSwapSingleSwapContract = new web3.eth.Contract(UniSwapSingleSwap.abi, UniSwapSingleSwapAddress)

const SushiSwapSingleSwapAddress = '0x986aaa537b8cc170761FDAC6aC4fc7F9d8a20A8C'
const SushiSwapSingleSwapContract = new web3.eth.Contract(SushiSwapSingleSwap.abi, SushiSwapSingleSwapAddress)
let main = async () => {
    if (isPolling == false){

        isPolling = true

        let {uniPrice, uniPrice2, uniPrice3} = await uniswapPriceCalc.main()
        let {sushiPrice, sushiPrice2, sushiPrice3} = await sushiSwapPriceCalc.main()

        let pair1 = getPercentDifference(uniPrice,sushiPrice)
        let pair2 = getPercentDifference(uniPrice2,sushiPrice2)
        let pair3 = getPercentDifference(uniPrice3,sushiPrice3)
        console.log(pair1)
        console.log(pair2)
        console.log(pair3)
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
        //Wrap some ETH to be used for trading.

        // let amountOut = await uniSwapSingleSwapTokens(1,0,WETH,WBTC,500)
        // let amountOutSushi = await sushiSwapSingleSwapTokens(1,0,WETH,WBTC,5000000000)
        // console.log(amountOut.toFixed(8))
        // console.log(amountOutSushi.toFixed(8))
        if(pair3 >= 3.5){
            let wethAmountToTransfer = 30
            await wrapEth(wethAmountToTransfer,process.env.ACCOUNT)
            let wethBalBefore = await WETHContract.methods.balanceOf(process.env.ACCOUNT).call()
            await sendToken(wethAmountToTransfer,'0x4bf010f1b9beDA5450a8dD702ED602A104ff65EE',WETHContract)
            let direction = getTokenDirection(uniPrice3,sushiPrice3)
            console.log(direction)
            let amountToTrade = BigNumber(10).shiftedBy(8).toString()
            try{
                await AaveFlashLoanContract.methods.myFlashLoanCall(WETH,APE,direction,3000,amountToTrade,0,5000000000).send({from: process.env.ACCOUNT})
            }catch(error){
                console.log(error)
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