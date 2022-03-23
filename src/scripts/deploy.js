const { ethers } = require("hardhat");

async function main() {
  const AaveFlashLoan = await ethers.getContractFactory('AaveFlashLoan')
  const aaveFlashLoan = await AaveFlashLoan.deploy("0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5");
  
  // We get the contract to deploy
  const UniSwapSingleSwap = await ethers.getContractFactory("UniSwapSingleSwap");
  const uniSwapSingleSwap = await UniSwapSingleSwap.deploy("0xE592427A0AEce92De3Edee1F18E0157C05861564");

  
  const SushiSwapSingleSwap = await ethers.getContractFactory('SushiSwapSingleSwap')
  const sushiSwapSingleSwap = await SushiSwapSingleSwap.deploy("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");


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

