const { ethers } = require("hardhat");
const { AaveILendingPoolAddressesProvider, UniSwapV3RouterAddress, SushiSwapV2RouterAddress } = require('../EVMAddresses/ethMainnetAddresses')

async function main() {
  const AaveFlashLoan = await ethers.getContractFactory('AaveFlashLoan')
  const aaveFlashLoan = await AaveFlashLoan.deploy(AaveILendingPoolAddressesProvider);
  
  // We get the contract to deploy
  const UniSwapSingleSwap = await ethers.getContractFactory("UniSwapSingleSwap");
  const uniSwapSingleSwap = await UniSwapSingleSwap.deploy(UniSwapV3RouterAddress);

  
  const SushiSwapSingleSwap = await ethers.getContractFactory('SushiSwapSingleSwap')
  const sushiSwapSingleSwap = await SushiSwapSingleSwap.deploy(SushiSwapV2RouterAddress);


  console.log("AaveFlashLoan deployed to:", aaveFlashLoan.address);
  console.log("UniSwapSingleSwap deployed to:", uniSwapSingleSwap.address);
  console.log("SushiSwapSingleSwap deployed to:", sushiSwapSingleSwap.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

