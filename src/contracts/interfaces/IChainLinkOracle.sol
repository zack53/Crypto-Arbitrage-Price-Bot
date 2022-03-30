pragma solidity 0.8.10;


interface IChainLinkOracle {
    function latestAnswer() external view returns (int256);
}