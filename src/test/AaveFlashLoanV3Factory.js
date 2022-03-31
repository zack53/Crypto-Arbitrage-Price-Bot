//https://trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts.html
//The link above is a good resource for everything related to truffle contracts.

const { web3, assert } = require("hardhat")
const { WETH, WBTC, ERC20ABI, AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress} = require('../EVMAddresses/evmAddresses')
const {wrapToken, sendToken} = require('../util/ArbitrageUtil')
//Creates a truffe contract from compiled artifacts.
const AaveFlashLoanV3Factory = artifacts.require("AaveFlashLoanV3Factory")
const AaveFlashLoan = artifacts.require("AaveFlashLoanV3")

const WETHContract = new web3.eth.Contract(ERC20ABI, WETH)
const WBTCContract = new web3.eth.Contract(ERC20ABI, WBTC)

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe( "AaveFlashLoanV3Factory contract", function () {
  let accounts;
  let aaveFlashLoanFactory
  let aaveFlashLoan
  before(async function () {
    accounts = await web3.eth.getAccounts();
    //Checks to see if the first account has ETH
    let balance = await web3.eth.getBalance(accounts[0])
    assert.notEqual(balance, 0)
    //deploy contract
    aaveFlashLoanFactory = await AaveFlashLoanV3Factory.new(AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress);
    //const gasEstimate = await aaveFlashLoan.createInstance.estimateGas();
  });

  it("Should deploy with the correct address", async function () {
    assert.equal(await aaveFlashLoanFactory.addressProvider(),AaveILendingPoolAddressesProviderv3)
  })

  it('Should get matic value needed', async () => {
    assert.notEqual(web3.utils.fromWei(await aaveFlashLoanFactory.getMaticValueNeededForNewContract(),'ether'),0)
  })

  it("Should fail to create a new flash loan contract.", async function () {
    try{
      await aaveFlashLoanFactory.createNewFlashLoanContract({from: accounts[1]})
    }catch(error){}
    
    assert.equal((await aaveFlashLoanFactory.getAmountOfFlashLoansCreated()).toNumber(),0)
  })

  it("Should create a new flash loan contract with owner and no matic sent for payment.", async function () {
    await aaveFlashLoanFactory.createNewFlashLoanContract({from: accounts[0]})
    assert.equal((await aaveFlashLoanFactory.getAmountOfFlashLoansCreated()).toNumber(),1)
  })

  it("Should create a new flash loan contract requiring correct matic amount.", async function () {
    await aaveFlashLoanFactory.createNewFlashLoanContract({from: accounts[1], value: web3.utils.toWei('50','ether')})
    let deployedAddress = await aaveFlashLoanFactory.getFlashLoanContract(accounts[1])
    aaveFlashLoan = await AaveFlashLoan.at(deployedAddress)
    assert.equal((await aaveFlashLoanFactory.getAmountOfFlashLoansCreated()).toNumber(),2)
  })

  it("Should fail to create new flash loan after changing USD amount needed.", async function () {
    await aaveFlashLoanFactory.changeUSDAmount(10000)
    try{
      await aaveFlashLoanFactory.createNewFlashLoanContract({from: accounts[1], value: web3.utils.toWei('50','ether')})
    }catch(error){}
    assert.equal((await aaveFlashLoanFactory.getAmountOfFlashLoansCreated()).toNumber(),2)
  })

  it("Should withdraw any funds.", async function () {
    await aaveFlashLoanFactory.withdraw()
  })

  it('Should transfer ownership.', async function () {
    await aaveFlashLoan.transferOwnership(accounts[0], {from: accounts[1]});
    assert.equal(await aaveFlashLoan.getOwner(), accounts[0])
  })

  it("Should deploy with the correct address", async function () {
    assert.equal(await aaveFlashLoan.ADDRESSES_PROVIDER(),AaveILendingPoolAddressesProviderv3)
  });

  it('Should fail to borrow WETH using UniSwap V3 first.', async function () {
    let wethAmountToTransfer = 15
    //The link at the top of this file describes how to override 
    //the from value when dealing with transactions using truffle contracts.
    //I am sending the wethAmountToTransfer to the contract to be swapped on
    //UniSwap V3 Pool for WBTC. The WBTC is then transferred back to the account
    //that sent the request.
    await aaveFlashLoan.myFlashLoanCall(WETH, WBTC, 1, 3000, web3.utils.toWei(wethAmountToTransfer.toString(),'ether'), 0, 5000000000, {from: accounts[0]})
  })


  it('Should borrow WETH using UniSwap V3 first.', async function () {
    let wethAmountToTransfer = 15
    //Send ETH to WETH contract in return for WETH
    await wrapToken(wethAmountToTransfer, accounts[0], WETHContract)
    //Sends WETH to the contract to be able to pay premium fee during test.
    await sendToken(wethAmountToTransfer, aaveFlashLoan.address, accounts[0], WETHContract)
    let wethContractBal = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.equal(web3.utils.fromWei(wethContractBal,'ether'),wethAmountToTransfer)
    //The link at the top of this file describes how to override 
    //the from value when dealing with transactions using truffle contracts.
    //I am sending the wethAmountToTransfer to the contract to be swapped on
    //UniSwap V3 Pool for WBTC. The WBTC is then transferred back to the account
    //that sent the request.
    await aaveFlashLoan.myFlashLoanCall(WETH, WBTC, 1, 3000, web3.utils.toWei(wethAmountToTransfer.toString(),'ether'), 0, 5000000000, {from: accounts[0]})
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
    await aaveFlashLoan.myFlashLoanCall(WETH, WBTC, 0, 3000, web3.utils.toWei(wethAmountToTransfer.toString(),'ether'), 0, 5000000000, {from: accounts[0]})
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
    let wethContractBalAfter = await WETHContract.methods.balanceOf(aaveFlashLoan.address).call()
    assert.equal(wethContractBal,wethContractBalAfter)
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
    assert.equal(await aaveFlashLoan.getOwner(), accounts[1])
  })

  it('Should fail to transfer ownership.', async function () {
    try{
      await aaveFlashLoan.transferOwnership(accounts[2]);
    }catch(error){}
    assert.equal(await aaveFlashLoan.getOwner(), accounts[1])
  })

})
