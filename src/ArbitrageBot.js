require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const UniswapV3PriceCalculator = require('./UniswapPriceCalculator')
const SushiSwapPriceCalculator = require('./SushiSwapPriceCalculator')
const AaveFlashLoan = require('./artifacts/contracts/AaveFlashLoanV3.sol/AaveFlashLoanV3.json')
const { WETH, WBTC, APE, ERC20ABI, SushiWETHtoWBTCPairAddress, SushiWETHtoUSDTPairAddress, SushiAPEtoWETHPairAddress } = require('./EVMAddresses/evmAddresses')
const { default: BigNumber } = require('bignumber.js')

const AaveFlashLoanAddress = '0x89738EFa2e2944062d52669DdfF4598D22Ce02dB'


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

let getTokenDecimal = async (tokenContract) => {
    return parseInt(await tokenContract.methods.decimals().call())
}
const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))
let uniswapPriceCalc = new UniswapV3PriceCalculator(web3)
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

        let {uniPrice, uniPrice2, uniPrice3} = await uniswapPriceCalc.main()
        let sushiPrice = await sushiSwapPriceCalc.getPairPrice(1)
        let sushiPrice2 = await sushiSwapPriceCalc2.getPairPrice(1)
        let sushiPrice3 = await sushiSwapPriceCalc3.getPairPrice(1)
        console.log('------------------------------SushiSwap V2-------------------------------------')
        console.log(`WETH/WBTC: ${sushiPrice.toFixed(8)} | USDT/WETH: ${sushiPrice2.toFixed(8)} | APE/WETH ${sushiPrice3.toFixed(8)}`)
        console.log('-------------------------------------------------------------------------------')
        process.exit()
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
        if(pair3 >= 1){
            let wethAmountToTransfer = 20
            try{
                await wrapEth(wethAmountToTransfer,process.env.ACCOUNT)
            }catch(error){
                console.log(error)
                process.exit()
            }
            await sendToken(wethAmountToTransfer, AaveFlashLoanAddress, WETHContract)
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