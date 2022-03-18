const UniSwapSingleSwap = artifacts.require("UniSwapSingleSwap");

// Traditional Truffle test
contract("UniSwapSingleSwap", (accounts) => {
  it("Should swap ERC20 tokens when ran", async function () {
    const uniSwapSingleSwap = await UniSwapSingleSwap.new("0xE592427A0AEce92De3Edee1F18E0157C05861564");
    assert.equal(await uniSwapSingleSwap.swapRouter(), "0xE592427A0AEce92De3Edee1F18E0157C05861564");
    //assert.equal(await greeter.greet(), "Hello, world!");

    //await greeter.setGreeting("Hola, mundo!");

  });
});

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("UniSwapSingleSwap contract", function () {
  let accounts;

  before(async function () {
    accounts = await web3.eth.getAccounts();
  });

  describe("Deployment", function () {
    it("Should deploy with the correct address", async function () {
      const uniSwapSingleSwap = await UniSwapSingleSwap.new("0xE592427A0AEce92De3Edee1F18E0157C05861564");
      assert.equal(await uniSwapSingleSwap.swapRouter(), "0xE592427A0AEce92De3Edee1F18E0157C05861564");
    });
  });
});

