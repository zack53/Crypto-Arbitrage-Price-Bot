require('dotenv').config()
const BigNumber = require('bignumber.js')
const {SushiV2FactoryAddress, SushiV2FactoryABI, SushiSwapV2RouterAddress, SushiV2RouterABI, SushiWETHtoWBTCPairAddress, SushiWETHtoUSDTPairAddress, SushiAPEtoWETHPairAddress, SushiPairAddressABI, ERC20ABI } = require('./EVMAddresses/evmAddresses')
/**
  https://thegraph.com/hosted-service/subgraph/zippoxer/sushiswap-subgraph-fork?selected=playground
  https://api.thegraph.com/subgraphs/name/zippoxer/sushiswap-subgraph-fork
Query for USDT/WBTC price
{
 pairs(
  where: {
   id_in: [
    "0x784178d58b641a4febf8d477a6abd28504273132"
   ]
  }
 ) {
  id
  token0Price
  token0 {
   symbol
   decimals
  }
  token1Price
  token1 {
   symbol
   decimals
  }
 }
}
 */
class SushiSwapPriceCalculator{
    constructor(web3){
        this.web3 = web3
        this.ERC20ABI = ERC20ABI
        
        this.SushiV2FactoryAddress = SushiV2FactoryAddress
        this.SushiV2FactoryABI = SushiV2FactoryABI
        this.SushiV2FactoryContract = new this.web3.eth.Contract(this.SushiV2FactoryABI, this.SushiV2FactoryAddress)
        
        this.SushiV2RouterAddress = SushiSwapV2RouterAddress
        this.SushiV2RouterABI = SushiV2RouterABI
    
        this.WETHtoWBTCPairAddress = SushiWETHtoWBTCPairAddress
        this.WETHtoUSDTPairAddress = SushiWETHtoUSDTPairAddress
        this.APEtoWETHPairAddress = SushiAPEtoWETHPairAddress
        this.SushiPairAddressABI = SushiPairAddressABI

        this.SushiV2Router = new this.web3.eth.Contract(this.SushiV2RouterABI, this.SushiV2RouterAddress)
    
        this.WETHtoWBTCSushiPair = new this.web3.eth.Contract(this.SushiPairAddressABI, this.WETHtoWBTCPairAddress)
        this.WETHtoUSDTSushiPair = new this.web3.eth.Contract(this.SushiPairAddressABI, this.WETHtoUSDTPairAddress)
        this.WBTCtoUSDTSushiPair = new this.web3.eth.Contract(this.SushiPairAddressABI, this.APEtoWETHPairAddress)
    }
    async getPairSymbol(token0, token1){
        let token0Sym = await token0.methods.symbol().call()
        let token1Sym = await token1.methods.symbol().call()
        return `${token0Sym}/${token1Sym}`
    }

    async getTokenContractsFromPair(sushiPair){
        let token0 = await sushiPair.methods.token0().call()
        let token1 = await sushiPair.methods.token1().call()
        return {"token0" : token0, "token1" : token1}
    }

    async getAllPairs(){
        let pairObj = {}
        let allPairsLength = await this.SushiV2FactoryContract.methods.allPairsLength().call()
        for(let i =0; i < allPairsLength-1; i++){
            try{
                let pairAddress = await this.SushiV2FactoryContract.methods.allPairs(i).call()
                let pairContract = new this.web3.eth.Contract(this.SushiPairAddressABI, pairAddress)
                let { token0, token1 } = await this.getTokenContractsFromPair(pairContract)
                let token0Contract = new this.web3.eth.Contract(this.ERC20ABI, token0)
                let token1Contract = new this.web3.eth.Contract(this.ERC20ABI, token1)
                let pairSymbols = await this.getPairSymbol(token0Contract, token1Contract)
                pairObj[pairAddress] = {'pairAddress' : pairAddress, 'pairSymbol' : pairSymbols, 'token0' : token0, 'token1' : token1}
            } catch(error){
                console.log(error)
            }
        }
        return pairObj
    }

    async calculatePrice(amount, reserve0, reserve1, decimal0, decimal1){
        let reserveCheck = BigNumber(reserve0).shiftedBy(-decimal0)
        if (reserve0 > reserve1){
            let temp = reserve0
            reserve0 = reserve1
            reserve1 = temp
        }
        let reserve0Big = BigNumber(reserve0)
        let reserve1Big = BigNumber(reserve1)
        // You will get the amount in reserve1 if the reserve0 is less than 1,
        // so to calculate price for low liquidity you need to artificially
        // add liquidity to the amount for a correct price.
        if(reserveCheck.toNumber() < 1){
            reserve0Big = reserve0Big.shiftedBy(10)
            reserve1Big = reserve1Big.shiftedBy(10)
        }
        //Passing in amount shifted by decimal0
        let price = BigNumber(await this.SushiV2Router.methods.quote(BigNumber(amount).shiftedBy(decimal0), reserve0Big, reserve1Big).call())
        //Shift left by decimal1 to get the final output.
        return price.shiftedBy(-decimal1)
    }

    async main(){
        let WETHtoWBTCReserves = await this.WETHtoWBTCSushiPair.methods.getReserves().call()
        let WETHtoWBTCAmountOut = BigNumber(await this.calculatePrice(1,WETHtoWBTCReserves._reserve0,WETHtoWBTCReserves._reserve1,8,18))

        let WETHtoUSDTReserves = await this.WETHtoUSDTSushiPair.methods.getReserves().call()
        let WETHtoUSDTAmountOut = BigNumber(await this.calculatePrice(1,WETHtoUSDTReserves._reserve0,WETHtoUSDTReserves._reserve1,18,6))
 

        let WBTCtoUSDTReserves = await this.WBTCtoUSDTSushiPair.methods.getReserves().call()
        let WBTCtoUSDTCAmountOut = BigNumber(await this.calculatePrice(1,WBTCtoUSDTReserves._reserve0,WBTCtoUSDTReserves._reserve1,18,18))

        let price = WETHtoWBTCAmountOut
        let price2 = WETHtoUSDTAmountOut
        let price3 = WBTCtoUSDTCAmountOut
        console.log('------------------------------SushiSwap V2-------------------------------------')
        console.log(`WETH/WBTC: ${price.toFixed(8)} | USDT/WETH: ${price2.toFixed(8)} | APE/WETH ${price3.toFixed(8)}`)
        console.log('-------------------------------------------------------------------------------')
        return {'sushiPrice' : price.toNumber(), 'sushiPrice2' : price2.toNumber(), 'sushiPrice3' : price3.toNumber()}
    }
}

module.exports = SushiSwapPriceCalculator