const axios = require('axios')
const Web3 = require('web3')

module.exports = {

    /**
     * Calculates a % difference to be used to determine
     * what would be a profitiable trade.
     * @param {*} price 
     * @param {*} price2 
     * @returns 
     */
    getPercentDifference: (price,price2) => {
        let higherPrice = (price >= price2) ? price : price2
        let lowerPrice = (price < price2) ? price : price2
        return 100-(lowerPrice/higherPrice)*100
    },

    /**
     * Gets the appropriate direction to use when sending 
     * a request to the flash loan to execute.
     * @param {*} uniSwapPrice 
     * @param {*} sushiSwapPrice 
     * @returns 
     */
    getTokenDirection: (uniSwapPrice,sushiSwapPrice, isReversed) => {
        let direction = ''
        //Assuming uniswap is first price
        if(isReversed){
            direction = (uniSwapPrice < sushiSwapPrice) ? 1 : 0
        }else{
            direction = (uniSwapPrice >= sushiSwapPrice) ? 1 : 0
        }
        return direction
    },

    /**
     * Wraps the native token to ERC20 token.
     * @param {*} amount 
     * @param {*} _from 
     * @param {*} tokenContract 
     */
    wrapToken: async (amount, _from, tokenContract) => {
        await tokenContract.methods.deposit().send({from: _from, value: web3.utils.toWei(amount.toString(), 'ether')})
    },

    /**
     * Sends the ERC20 token to the address provided.
     * Requires amount to be transfered, the address sending to,
     * from which account, and the token contract of the ERC20
     * token.
     * @param {*} amount 
     * @param {*} to 
     * @param {*} fromAccount 
     * @param {*} tokenContract 
     */
    sendToken: async(amount, to, fromAccount, tokenContract) => {
        await tokenContract.methods.transfer(to,web3.utils.toWei(amount.toString(), 'ether')).send({from: fromAccount})
    },

    /**
     * Gets the native token amount balance of the
     * address.
     * @param {*} address 
     * @returns 
     */
    getWalletEthBalance: async (address) => {
        let balance = await web3.eth.getBalance(address)
        return web3.utils.fromWei(wei, 'ether')
    },

    /**
     * Gets Polygon Gas Price from Polygon's GAS API.
     * Takes in a speed parameter than can be set to 
     * safeLow, standard, or fast.
     * @param {*} speed 
     * @returns 
     */
    getPolygonGasPrice: async (speed) => {
        // documentation can be found https://docs.polygon.technology/docs/develop/tools/polygon-gas-station
        // acceptable speeds are: safeLow, standard, fast
        let results = await axios.get('https://gasstation-mainnet.matic.network/v2')
        return Web3.utils.toWei(results.data[speed].maxPriorityFee.toFixed(9),'gwei')
    }
}