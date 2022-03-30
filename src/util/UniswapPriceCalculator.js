require('dotenv').config()
const BigNumber = require('bignumber.js')
const { UniswapV3FactoryContractAddress, UniswapV3FactoryABI, UniswapV3PoolABI, ERC20ABI} = require('../EVMAddresses/evmAddresses')


class UniswapV3PriceCalculator{
    constructor(web3, poolAddress){
        // Initialize constructor values
        this.web3 = web3
        this.poolAddress = poolAddress
        this.Q192 = BigNumber(2).exponentiatedBy(192)
        // These values will be cached during first getPairPrice call.
        this.token0Decimals = ''
        this.token1Decimals = ''
        this.priceCalculationDirection = ''
        
        this.UniswapV3Factory = new this.web3.eth.Contract(UniswapV3FactoryABI, UniswapV3FactoryContractAddress)

        this.poolContract = new this.web3.eth.Contract(UniswapV3PoolABI, this.poolAddress)

    }

    /**
     * Gets UniSwap pool address based on input parameters
     * @param {*} tokenA 
     * @param {*} tokenB 
     * @param {*} poolFee 
     * @returns 
     */
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

    async uniswapGetSqrtPrice(token0Dec, token1Dec){
        //Get slot0 function on the pool contract
        //where the sqrtPriceX96 is stored.
        let results = await this.poolContract.methods.slot0().call()
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

    async uniswapGetSqrtPriceReversed(token0Dec, token1Dec){
        //Get slot0 function on the pool contract
        //where the sqrtPriceX96 is stored.
        let results = await this.poolContract.methods.slot0().call()
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

    /**
     * Gets the token decimals. These decimal values are "cached" in
     * the class on the first iteration of the getPairPrice function.
     * @returns 
     */
    async getTokenDecimals(){
        let token0 = await this.poolContract.methods.token0().call()
        let token1 = await this.poolContract.methods.token1().call()
        let token0Contract = new this.web3.eth.Contract(ERC20ABI, token0)
        let token1Contract = new this.web3.eth.Contract(ERC20ABI, token1)
        let token0Decimals = await token0Contract.methods.decimals().call()
        let token1Decimals = await token1Contract.methods.decimals().call()
        return {'token0Decimals' : parseInt(token0Decimals), 'token1Decimals': parseInt(token1Decimals)}
    }
    async getPairPrice(){
        if(this.token0Decimals == ''){
            let {token0Decimals, token1Decimals} = await this.getTokenDecimals()
            this.token0Decimals = token0Decimals
            this.token1Decimals = token1Decimals
            let price1 = await this.uniswapGetSqrtPrice(this.token0Decimals,this.token1Decimals)
            let price2 = await this.uniswapGetSqrtPriceReversed(this.token1Decimals,this.token0Decimals)
            this.priceCalculationDirection = (price1 > price2) ? true : false
        }
        return (this.priceCalculationDirection) ? await this.uniswapGetSqrtPrice(this.token0Decimals,this.token1Decimals) : await this.uniswapGetSqrtPriceReversed(this.token1Decimals,this.token0Decimals)
    }
}

// Exports the class to be used by ArbitrageBot.js
module.exports = UniswapV3PriceCalculator