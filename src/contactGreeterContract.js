require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')

const contractABI = [{"inputs":[{"internalType":"string","name":"_greeting","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"greet","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_greeting","type":"string"}],"name":"setGreeting","outputs":[],"stateMutability":"nonpayable","type":"function"}]
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'


const web3 = new Web3(new HDWalletProvider(process.env.PRIVATE_KEY,process.env.RPC_URL))

const GREETER_CONTRACT = new web3.eth.Contract(contractABI, contractAddress)

GREETER_CONTRACT.methods.greet().call().then((result) => {
    console.log(result)
    process.exit()
});
