require('dotenv').config()
const BigNumber = require('bignumber.js')
const { UniWETHtoWBTCPoolAddress, UniWETHtoUSDTPoolAddress, UniAPEToWETHPoolAddress, UniUNItoWETHPoolAddress, UniswapV3FactoryContractAddress, UniswapV3FactoryABI, UniswapV3PoolABI, ERC20ABI} = require('./EVMAddresses/evmAddresses')


class UniswapV3PriceCalculator{
    constructor(web3){
        this.web3 = web3
        this.Q192 = BigNumber(2).exponentiatedBy(192)
        //Uniswaps V3 Factory address and ABI
        this.UniswapV3FactoryContractAddress = UniswapV3FactoryContractAddress
        this.UniswapV3FactoryABI = UniswapV3FactoryABI
        //Uniswaps V3 Pool ABI
        this.UniswapV3PoolABI = UniswapV3PoolABI
        //ERC20 ABI
        this.ERC20ABI = ERC20ABI
        this.UniswapV3Factory = new this.web3.eth.Contract(this.UniswapV3FactoryABI, this.UniswapV3FactoryContractAddress)

        this.WETHtoWBTCPoolAddress = UniWETHtoWBTCPoolAddress
        this.WETHtoUSDTPoolAddress = UniWETHtoUSDTPoolAddress
        this.APEToWETHPoolAddress = UniAPEToWETHPoolAddress
        this.UniswapV3PoolWETHtoWBTC = new this.web3.eth.Contract(this.UniswapV3PoolABI, this.WETHtoWBTCPoolAddress)
        this.UniswapV3PoolWETHtoUSDT = new this.web3.eth.Contract(this.UniswapV3PoolABI, this.WETHtoUSDTPoolAddress)
        this.UniswapV3PoolAPEtoWETH = new this.web3.eth.Contract(this.UniswapV3PoolABI, this.APEToWETHPoolAddress)
    }
    async getUniswapPoolAddress (tokenA, tokenB, poolFee) {
        return await this.UniswapV3Factory.methods.getPool(tokenA,tokenB,poolFee).call()
    }
    //Not fully implemented TWAP price calculator
    async getPoolObservation() {
        try {
            results = await this.UniswapV3PoolWETHtoWBTC.methods.observe([0, 10]).call()
            console.log(results)
            tickCumList = results.tickCumulatives
            console.log(tickCumList)
            let i = (Math.abs(tickCumList[1] - tickCumList[0]))/10
            console.log(i)
            console.log(Math.sqrt(1.0001**(2*i)))
        } catch (error) {
            console.log(error)
        }
    }

    async uniswapGetSqrtPrice(token0Dec, token1Dec, poolContract, token0Sym, token1Sym){
        //Get slot0 function on the pool contract
        //where the sqrtPriceX96 is stored.
        let results = await poolContract.methods.slot0().call()
        //Remove sqrt 
        let ratioX96 = BigNumber(results.sqrtPriceX96).exponentiatedBy(2)
        //Get token0 by dividing ratioX96 / Q192 and shifting decimal 
        //values of the coins to put in human readable format.
        let price = ratioX96.dividedBy(this.Q192).shiftedBy(token0Dec-token1Dec)
        //Get token0 by dividing Q192 / ratioX96 and shifting decimal 
        //values of the coins to put in human readable format.
        //let price2 =  this.Q192.dividedBy(ratioX96).shiftedBy(token1Dec-token0Dec)
        return price
    }

    async uniswapGetSqrtPriceReversed(token0Dec, token1Dec, poolContract, token0Sym, token1Sym){
        //Get slot0 function on the pool contract
        //where the sqrtPriceX96 is stored.
        let results = await poolContract.methods.slot0().call()
        //Remove sqrt 
        let ratioX96 = BigNumber(results.sqrtPriceX96).exponentiatedBy(2)
        //Get token0 by dividing ratioX96 / Q192 and shifting decimal 
        //values of the coins to put in human readable format.
        let price = this.Q192.dividedBy(ratioX96).shiftedBy(token0Dec-token1Dec)
        //Get token0 by dividing Q192 / ratioX96 and shifting decimal 
        //values of the coins to put in human readable format.
        //let price2 =  this.Q192.dividedBy(ratioX96).shiftedBy(token1Dec-token0Dec)
        return price
    }

    async main(){
        let value1 = await this.uniswapGetSqrtPriceReversed(8,18,this.UniswapV3PoolWETHtoWBTC,'WBTC','WETH')
        let value2 = await this.uniswapGetSqrtPrice(18,6,this.UniswapV3PoolWETHtoUSDT,'WETH','USDT')
        let value3 = await this.uniswapGetSqrtPriceReversed(18,18,this.UniswapV3PoolAPEtoWETH,'APE','WETH')
        console.log('-------------------------------Uniswap V3--------------------------------------')
        console.log(`WETH/WBTC: ${value1.toFixed(8)} | USDT/WETH: ${value2.toFixed(8)} | APE/WETH: ${value3.toFixed(8)}`)
        console.log('-------------------------------------------------------------------------------')
        return {'uniPrice' : value1.toNumber(), 'uniPrice2' : value2.toNumber(), 'uniPrice3' : value3.toNumber()}
    }
}

module.exports = UniswapV3PriceCalculator