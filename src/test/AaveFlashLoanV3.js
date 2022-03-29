//https://trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts.html
//The link above is a good resource for everything related to truffle contracts.

const { web3, assert } = require("hardhat")
const { WETH, WBTC, ERC20ABI, AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress} = require('../EVMAddresses/evmAddresses')

//Creates a truffe contract from compiled artifacts.
const AaveFlashLoan = artifacts.require("AaveFlashLoanV3")

const WETHContract = new web3.eth.Contract(ERC20ABI, WETH)
const WBTCContract = new web3.eth.Contract(ERC20ABI, WBTC)

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe( "AaveFlashLoanV3 contract", function () {
  let accounts;
  let aaveFlashLoan
  before(async function () {
    accounts = await web3.eth.getAccounts();
    //Checks to see if the first account has ETH
    let balance = await web3.eth.getBalance(accounts[0])
    assert.notEqual(balance, 0)
    //deploy contract
    aaveFlashLoan = await AaveFlashLoan.new(AaveILendingPoolAddressesProviderv3, accounts[0], UniSwapV3RouterAddress, SushiSwapV2RouterAddress);
    //const gasEstimate = await aaveFlashLoan.createInstance.estimateGas();
  });

  it("Should deploy with the correct address", async function () {
    assert.equal(await aaveFlashLoan.ADDRESSES_PROVIDER(),AaveILendingPoolAddressesProviderv3)
  });

  it('Should borrow WETH using UniSwap V3 first.', async function () {
    let wethAmountToTransfer = 15
    //Send ETH to WETH contract in return for WETH
    await wrapEth(wethAmountToTransfer, accounts[0])
    //Sends WETH to the contract to be able to pay premium fee during test.
    await sendWrapEth(wethAmountToTransfer, aaveFlashLoan.address, accounts[0])
    let wethContractBal = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.equal(web3.utils.fromWei(wethContractBal,'ether'),wethAmountToTransfer)
    //The link at the top of this file describes how to override 
    //the from value when dealing with transactions using truffle contracts.
    //I am sending the wethAmountToTransfer to the contract to be swapped on
    //UniSwap V3 Pool for WBTC. The WBTC is then transferred back to the account
    //that sent the request.
    await aaveFlashLoan.myFlashLoanCall(WETH, WBTC, 1, 500, web3.utils.toWei(wethAmountToTransfer.toString(),'ether'), 0, 5000000000, {from: accounts[0]})
    let wethContractBalAfter = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.notEqual(wethContractBalAfter, 0)
  })

  it('Should borrow WETH using SushiSwap First.', async function () {
    let wethAmountToTransfer = 15
    //The link at the top of this file describes how to override 
    //the from value when dealing with transactions using truffle contracts.
    //I am sending the wethAmountToTransfer to the contract to be swapped on
    //UniSwap V3 Pool for WBTC. The WBTC is then transferred back to the account
    //that sent the request.
    await aaveFlashLoan.myFlashLoanCall(WETH, WBTC, 0, 500, web3.utils.toWei(wethAmountToTransfer.toString(),'ether'), 0, 5000000000, {from: accounts[0]})
    let wethContractBalAfter = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.notEqual(wethContractBalAfter, 0)
  })

  it('Should fail to withdraw all WETH token if not owner.', async function () {
    let wethContractBal = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    if(wethContractBal > 0){
      try{
        await aaveFlashLoan.withdrawERC20Token(WETH, {from: accounts[1]});
      }catch(error){}
    }
    let wethContractBalAfterWithdraw = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.notEqual(wethContractBalAfterWithdraw, 0)
  })

  it('Should withdraw all WETH token.', async function () {
    let wethContractBal = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    if(wethContractBal > 0){
      await aaveFlashLoan.withdrawERC20Token(WETH);
    }
    let wethContractBalAfterWithdraw = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.equal(wethContractBalAfterWithdraw, 0)
  })

  it('Should withdraw all WBTC token.', async function () {
    let wbtcContractBal = await WBTCContract.methods.balanceOf(aaveFlashLoan.address).call()
    if(wbtcContractBal > 0){
      await aaveFlashLoan.withdrawERC20Token(WBTC);
    }
    let wbtcContractBalAfterWithdraw = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.equal(wbtcContractBalAfterWithdraw, 0)
  })

  it('Should transfer ownership.', async function () {
    await aaveFlashLoan.transferOwnership(accounts[1]);
    assert.equal(await aaveFlashLoan.owner(), accounts[1])
  })

  it('Should fail to transfer ownership.', async function () {
    try{
      await aaveFlashLoan.transferOwnership(accounts[2]);
    }catch(error){}
    assert.equal(await aaveFlashLoan.owner(), accounts[1])
  })

})

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