//https://trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts.html
//The link above is a good resource for everything related to truffle contracts.

//Creates a truffe contract from compiled artifacts.
const UniSwapSingleSwap = artifacts.require("UniSwapSingleSwap")
const { WETH, WBTC, ERC20ABI, UniSwapV3RouterAddress} = require('../EVMAddresses/ethMainnetAddresses')

const WETHContract = new web3.eth.Contract(ERC20ABI, WETH)
const WBTCContract = new web3.eth.Contract(ERC20ABI, WBTC)

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("UniSwapSingleSwap contract", function () {
  let accounts;
  let uniSwapSingleSwap
  before(async function () {
    accounts = await web3.eth.getAccounts();
    //Checks to see if the first account has ETH
    let balance = await web3.eth.getBalance(accounts[0])
    assert.notEqual(balance, 0)
    //deploy contract
    uniSwapSingleSwap = await UniSwapSingleSwap.new(UniSwapV3RouterAddress);
  });

  describe("Swap router address should match", function () {
    it("Should deploy with the correct address", async function () {
      assert.equal(await uniSwapSingleSwap.swapRouter(), UniSwapV3RouterAddress)
    });

    it('Should swap token values WETH for WBTC', async function () {
      let wethAmountToTransfer = 15
      //Send ETH to WETH contract in return for WETH
      await wrapEth(wethAmountToTransfer, accounts[0])
      //Sends WETH to the deployed contract and
      //checks the results.

      //await sendWrapEth(wethAmountToTransfer,uniSwapSingleSwap.address, accounts[0])
      //let contractWethBal = await WETHContract.methods.balanceOf(uniSwapSingleSwap.address).call()
      //assert.equal(web3.utils.fromWei(contractWethBal,'ether'),wethAmountToTransfer)

      await WETHContract.methods.approve(uniSwapSingleSwap.address, web3.utils.toWei(wethAmountToTransfer.toString(),'ether')).send({from: accounts[0]})

      //The link at the top of this file describes how to override 
      //the from value when dealing with transactions using truffle contracts.
      //I am sending the wethAmountToTransfer to the contract to be swapped on
      //UniSwap V3 Pool for WBTC. The WBTC is then transferred back to the account
      //that sent the request.
      await uniSwapSingleSwap.swapExactInputSingle(web3.utils.toWei(wethAmountToTransfer.toString(),'ether'),0,WETH,WBTC,500, {from: accounts[0]})
      let WBTCBal = await WBTCContract.methods.balanceOf(accounts[0]).call()
      assert.notEqual(WBTCBal/10**8, 0)
    })

  });
});

//Need to put these functions in a class to export from 
//to avoid having duplicate code in both ArbitrageBot.js
//and current file. This could also break testing if
//these two instances got out of sync. Need to work on
//this immediately.
let wrapEth = async (amount, account) => {
  await WETHContract.methods.deposit().send({from: account, value: web3.utils.toWei(amount.toString(), 'ether')})
}

let sendWrapEth = async(amount, to, fromAccount) => {
  await WETHContract.methods.transfer(to,web3.utils.toWei(amount.toString(), 'ether')).send({from: fromAccount})
}