require('dotenv').config()
const {default: BigNumber} = require('bignumber.js')
const {SushiSwapV2RouterAddress, SushiV2RouterABI, SushiPairAddressABI, ERC20ABI} = require('../EVMAddresses/evmAddresses')

/**
 * Sushi Swap Price Calculator class to be initialized for a
 * specific SushiSwap pair.
 */
class SushiSwapPriceCalculator{
    /**
     * Class constructor takes in web3 and the pairAddress
     * @param {*} web3 
     * @param {*} pairAddress 
     */
    constructor(web3, pairAddress){
        // Initialize constructor values
        this.web3 = web3
        this.pairAddress = pairAddress
        // These values will be cached during first getPairPrice call.
        this.token0Decimals = ''
        this.token1Decimals = ''
        this.priceCalculationDirection = ''
        //Create contracts needed to interact with smart contracts
        this.SushiV2Router = new this.web3.eth.Contract(SushiV2RouterABI, SushiSwapV2RouterAddress)
        this.pairContract = new this.web3.eth.Contract(SushiPairAddressABI, this.pairAddress)
        this.token0 = this.pairContract.methods.token0().call().then((result) => {
            this.token0Contract = new this.web3.eth.Contract(ERC20ABI, result)
            return result
        })
        this.token1 = this.pairContract.methods.token1().call().then((result) => {
            this.token1Contract = new this.web3.eth.Contract(ERC20ABI, result)
            return result
        })
    }

    /**
     * Gets the token decimals. These decimal values are "cached" in
     * the class on the first iteration of the getPairPrice function.
     * @returns 
     */
    async getTokenDecimals(){
        let token0Decimals = await this.token0Contract.methods.decimals().call()
        let token1Decimals = await this.token1Contract.methods.decimals().call()
        await this.setTokenSymbol()
        return {'token0Decimals' : parseInt(token0Decimals), 'token1Decimals': parseInt(token1Decimals)}
    }

    /**
     * Sets the token symbols for this SushiSwap pair
     */
    async setTokenSymbol(){
        this.token0Symbol = await this.token0Contract.methods.symbol().call()
        this.token1Symbol = await this.token1Contract.methods.symbol().call()
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
     * Main function to be called on class to get the pair price. The
     * value returned will always be for going from the higher priced
     * token to the lower priced token to get a value above > 1.
     * @param {*} amount 
     * @returns 
     */
    async getPairPrice(){
        let {_reserve0, _reserve1} = await this.pairContract.methods.getReserves().call()
        if(this.token0Decimals == ''){
            let {token0Decimals, token1Decimals} = await this.getTokenDecimals()
            this.token0Decimals = token0Decimals
            this.token1Decimals = token1Decimals
        }
        return this.calculatePrice(1,_reserve0,_reserve1,this.token0Decimals,this.token1Decimals)
    }

    /**
     * Sets the direction so that the symbols can
     * be provided in the correcot order
     * @param {} price 
     */
    setPriceCalculationDirection(price){
        if(price >= 1){
            this.priceCalculationDirection = true
        }else {
            this.priceCalculationDirection = false
        }
    }
    /**
     * Function to get the price and adjust to human readable value.
     * @param {*} amount 
     * @param {*} reserve0 
     * @param {*} reserve1 
     * @param {*} decimal0 
     * @param {*} decimal1 
     * @returns 
     */
    async calculatePrice(amount, reserve0, reserve1, decimal0, decimal1){
        let reserveCheck = BigNumber(reserve0).shiftedBy(-decimal0)
        reserve0 = BigNumber(reserve0)
        reserve1 = BigNumber(reserve1)
        // You will get the amount in reserve1 if the reserve0 is less than 1,
        // so to calculate price for low liquidity you need to artificially
        // add liquidity to the amount for a correct price.
        if(reserveCheck.toNumber() < 1){
            reserve0 = reserve0.shiftedBy(10)
            reserve1 = reserve1.shiftedBy(10)
        }
        //Passing in amount shifted by decimal0
        let price = BigNumber(await this.SushiV2Router.methods.quote(BigNumber(amount).shiftedBy(decimal0), reserve0, reserve1).call())
        //Shift left by decimal1 to get the final output.
        price = price.shiftedBy(-decimal1)
        
        if(this.priceCalculationDirection == ''){
            this.setPriceCalculationDirection(price)
        }
        if(price.toNumber() < 1){
            price = BigNumber(1).dividedBy(price)
        }
        return price
    }
}

// Exports the class to be used by ArbitrageBot.js
module.exports = SushiSwapPriceCalculator