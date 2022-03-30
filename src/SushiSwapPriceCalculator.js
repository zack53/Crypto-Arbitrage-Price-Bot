require('dotenv').config()
const {default: BigNumber} = require('bignumber.js')
const {SushiV2FactoryAddress, SushiV2FactoryABI, SushiSwapV2RouterAddress, SushiV2RouterABI, SushiPairAddressABI, ERC20ABI } = require('./EVMAddresses/evmAddresses')

class SushiSwapPriceCalculator{
    constructor(web3, pairAddress){
        this.web3 = web3
        this.ERC20ABI = ERC20ABI
        this.pairAddress = pairAddress

        this.SushiV2FactoryAddress = SushiV2FactoryAddress
        this.SushiV2FactoryABI = SushiV2FactoryABI
        this.SushiV2FactoryContract = new this.web3.eth.Contract(this.SushiV2FactoryABI, this.SushiV2FactoryAddress)
        
        this.SushiV2RouterAddress = SushiSwapV2RouterAddress
        this.SushiV2RouterABI = SushiV2RouterABI
        this.SushiPairAddressABI = SushiPairAddressABI
        this.SushiV2Router = new this.web3.eth.Contract(this.SushiV2RouterABI, this.SushiV2RouterAddress)
        this.pairContract = new this.web3.eth.Contract(this.SushiPairAddressABI, this.pairAddress)
        
        this.token0Decimals = ''
        this.token1Decimals = ''
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

    async getTokenReserves(){
        return await this.pairContract.methods.getReserves().call()
    }

    async getTokenDecimals(){
        let token0 = await this.pairContract.methods.token0().call()
        let token1 = await this.pairContract.methods.token1().call()
        let token0Contract = new this.web3.eth.Contract(ERC20ABI, token0)
        let token1Contract = new this.web3.eth.Contract(ERC20ABI, token1)
        let token0Decimals = await token0Contract.methods.decimals().call()
        let token1Decimals = await token1Contract.methods.decimals().call()
        return {'token0Decimals' : parseInt(token0Decimals), 'token1Decimals': parseInt(token1Decimals)}
    }

    async getPairPrice(amount){
        let {_reserve0, _reserve1} = await this.getTokenReserves()
        if(this.token0Decimals == ''){
            let {token0Decimals, token1Decimals} = await this.getTokenDecimals()
            this.token0Decimals = token0Decimals
            this.token1Decimals = token1Decimals
        }
        return this.calculatePrice(amount,_reserve0,_reserve1,this.token0Decimals,this.token1Decimals)
    }

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
        if(price.toNumber() < 1){
            price = BigNumber(1).dividedBy(price)
        }
        return price
    }
}

module.exports = SushiSwapPriceCalculator