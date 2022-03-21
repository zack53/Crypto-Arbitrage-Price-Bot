//https://trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts.html
//The link above is a good resource for everything related to truffle contracts.

//Creates a truffe contract from compiled artifacts.
const SushiSwapSingleSwap = artifacts.require("SushiSwapSingleSwap");

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const WETHABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]
const WETHContract = new web3.eth.Contract(WETHABI, WETH)
const WBTCContract = new web3.eth.Contract(WETHABI, WBTC)

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe( "SushiSwapSingleSwap contract", function () {
  let accounts;
  let sushiSwapSingleSwap
  before(async function () {
    accounts = await web3.eth.getAccounts();
    //Checks to see if the first account has ETH
    let balance = await web3.eth.getBalance(accounts[0])
    assert.notEqual(balance, 0)
    //deploy contract
    sushiSwapSingleSwap = await SushiSwapSingleSwap.new("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  });

  describe("Swap router address should match", function () {
    it("Should deploy with the correct address", async function () {
      assert.equal(await sushiSwapSingleSwap.sushiRouter(), "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")
    });

    it('Should swap token values WETH for WBTC', async function () {
      let wethAmountToTransfer = 15
      //Send ETH to WETH contract in return for WETH
      await wrapEth(wethAmountToTransfer, accounts[0])
      //Approves the contract to trasnferFrom this address.
      await WETHContract.methods.approve(sushiSwapSingleSwap.address, web3.utils.toWei(wethAmountToTransfer.toString(),'ether')).send({from: accounts[0]})

      //The link at the top of this file describes how to override 
      //the from value when dealing with transactions using truffle contracts.
      //I am sending the wethAmountToTransfer to the contract to be swapped on
      //UniSwap V3 Pool for WBTC. The WBTC is then transferred back to the account
      //that sent the request.
      await sushiSwapSingleSwap.swapExactInputSingle(web3.utils.toWei(wethAmountToTransfer.toString(),'ether'),0,[WETH,WBTC],accounts[0],5000000000, {from: accounts[0]})
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