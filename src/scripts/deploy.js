const { ethers } = require("hardhat");

async function main() {
  const AaveFlashLoan = await ethers.getContractFactory('AaveFlashLoan')
  const aaveFlashLoan = await AaveFlashLoan.deploy("0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5");


  console.log("AaveFlashLoan deployed to:", aaveFlashLoan.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

