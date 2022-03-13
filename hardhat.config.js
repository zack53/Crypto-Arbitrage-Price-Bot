require("@nomiclabs/hardhat-truffle5")
require("@nomiclabs/hardhat-ethers")

module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
       forking: {
	       url: "https://eth-mainnet.alchemyapi.io/v2/igMZR6SY2EovyR9yscfnhbSbVvxP2lIO"
	    }
      }
  }
}

