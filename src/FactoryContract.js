require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')
const AaveFlashLoanFactory = require('./artifacts/contracts/AaveFlashLoanV3Factory.sol/AaveFlashLoanV3Factory.json')
const {AaveFlashLoanV3FactoryAddress} = require('./EVMAddresses/evmAddresses')
const { default: BigNumber } = require('bignumber.js')
const { getPolygonGasPrice } = require('./util/ArbitrageUtil')

/**
 * Initializes the web3 and factoryContract based on environment variables and
 * address in the ./EVMAddresses/evmAddresses location.
 */
const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))
const factoryContract = new web3.eth.Contract(AaveFlashLoanFactory.abi, AaveFlashLoanV3FactoryAddress)

/**
 * Gets the matic amount needed to purchase a flash loan contract
 * @returns 
 */
let getMaticNeeded = async () => {
    return await factoryContract.methods.getMaticValueNeededForNewContract().call()
}

/**
 * Purchases a flash loan setting the creatorAddress to the owner of the newly
 * created flash loan
 * @param {*} creatorAddress 
 */
let purchaseNewFlashLoanContract = async (creatorAddress) => {
    let maticNeeded = await getMaticNeeded()
    // Creates a flash loan contract with a standard amount
    // of gas price needed to execute.
    await factoryContract.methods.createNewFlashLoanContract().send({
        from: creatorAddress,
        value:maticNeeded,
        gas: await factoryContract.methods.createNewFlashLoanContract().estimateGas({value:maticNeeded}),
        gasPrice: await getPolygonGasPrice('standard')
    })
}

/**
 * Gets the newly created flash loan contract address using the
 * creatorAddress as the key.
 * @param {*} creatorAddress 
 * @returns 
 */
let getFlashLoanContractAddress = async (creatorAddress) => {
    return await factoryContract.methods.getFlashLoanContract(creatorAddress).call()
}

/**
 * **********************WARNING************************
 * main is set-up to purchase a flash loan contract
 */
let main = async () => {
    try{
        await purchaseNewFlashLoanContract(process.env.ACCOUNT)
        let flashLoanContract = await getFlashLoanContractAddress(process.env.ACCOUNT)
        console.log(flashLoanContract)
    }catch(error){
        console.log(error)
    }
    process.exit()
}
/**
 * **********************WARNING************************
 * Running main() below will try to purchase a new flash loan contract.
 * Ensure to run only if you want to buy a flash loan contract.
 */
// main()