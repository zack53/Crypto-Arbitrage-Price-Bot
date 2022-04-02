const { ethers, web3 } = require("hardhat");
const { AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress } = require('../EVMAddresses/evmAddresses')

/**
 * Script to deploy contracts using hardhat
 */
async function main() {
  // Get needed accounts
  const accounts = await web3.eth.getAccounts()

  // Get contract factory and deploy.
  const AaveFlashLoanV3Factory =  await ethers.getContractFactory("AaveFlashLoanV3Factory")
  const aaveFlashLoanV3Factory = await AaveFlashLoanV3Factory.deploy(AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress)

  // Deploy a new flash loan contract using AaveFlashLoanV3Factory function
  await aaveFlashLoanV3Factory.createNewFlashLoanContract()
  // Get deployed contract address
  let flashLoanAddress = await aaveFlashLoanV3Factory.getFlashLoanContract(accounts[0])

  // Log deployed contract addresses to console
  console.log("AaveFlashLoanV3Factory deployed to:", aaveFlashLoanV3Factory.address);
  console.log('AaveFlashLoanV3 deployed to:', flashLoanAddress)
}

// Call the main function to run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

