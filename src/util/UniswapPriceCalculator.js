require('dotenv').config()
const BigNumber = require('bignumber.js')
const { UniswapV3FactoryContractAddress, UniswapV3FactoryABI, UniswapV3PoolABI, ERC20ABI} = require('../EVMAddresses/evmAddresses')


class UniswapV3PriceCalculator{
    constructor(web3, poolAddress){
        // Initialize constructor values
        this.web3 = web3
        this.poolAddress = poolAddress
        this.Q192 = BigNumber(2).exponentiatedBy(192)
        // Initialize the price calc data to be checked during
        // first iteration of getPairPrice
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

    /**
     * Gets the Price for token0/token1
     * @param {*} token0Dec 
     * @param {*} token1Dec 
     * @returns 
     */
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

    /**
     * Gets the Price for token1/token0
     * @param {*} token0Dec 
     * @param {*} token1Dec 
     * @returns 
     */
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
     * Sets the token symbols
     */
    async setTokenSymbols(){
        this.token0Symbol = await this.token0Contract.methods.symbol().call()
        this.token1Symbol = await this.token1Contract.methods.symbol().call()
    }

    /**
     * Sets the token decimals. These decimal values are "cached" in
     * the class on the first iteration of the getPairPrice function.
     * @returns 
     */
    async setTokenDecimals(){
        this.token0Decimals = await this.token0Contract.methods.decimals().call()
        this.token1Decimals = await this.token1Contract.methods.decimals().call()
    }

    /**
     * Function to initialize the token contracts
     */
    async setTokenContracts(){
        this.token0 = await this.poolContract.methods.token0().call()
        this.token1 = await this.poolContract.methods.token1().call()
        this.token0Contract = new this.web3.eth.Contract(ERC20ABI, this.token0)
        this.token1Contract = new this.web3.eth.Contract(ERC20ABI, this.token1)
    }

    /**
     * Function to initialize all of the token data
     */
    async setPoolTokenInfo(){
        this.poolFee = await this.poolContract.methods.fee().call()
        await this.setTokenContracts()
        await this.setTokenDecimals()
        await this.setTokenSymbols()
    }

    async setPriceCalculationDirection(){
        let price1 = await this.uniswapGetSqrtPrice(this.token0Decimals,this.token1Decimals)
        let price2 = await this.uniswapGetSqrtPriceReversed(this.token1Decimals,this.token0Decimals)
        this.priceCalculationDirection = (price1 > price2) ? true : false
    }

    /**
     * Returns the symbols to string where the token of least value is to the left
     * and token of greatest value is to the right i.e. WMATIC/WBTC
     * @returns 
     */
    symbolsToString(){
        return (!this.priceCalculationDirection) ? `${this.token0Symbol}/${this.token1Symbol}` : `${this.token1Symbol}/${this.token0Symbol}`
    }

    /**
     * Gets the pair price for the pair initialized when the class is
     * created.
     * @returns 
     */
    async getPairPrice(){
        // We initialize all of the data if the price calc direction has not been set
        if(this.priceCalculationDirection  == ''){
            await this.setPoolTokenInfo()
            await this.setPriceCalculationDirection()
        }
        return (this.priceCalculationDirection) ? await this.uniswapGetSqrtPrice(this.token0Decimals,this.token1Decimals) : await this.uniswapGetSqrtPriceReversed(this.token1Decimals,this.token0Decimals)
    }
}

// Exports the class to be used by ArbitrageBot.js
module.exports = UniswapV3PriceCalculator