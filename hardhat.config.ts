import { HardhatUserConfig } from "hardhat/config";
import "@hashgraph/hardhat-hethers";

const operatorAccount = process.env.HEDERA_OPERATOR_ID || "";
const operatorKey = process.env.HEDERA_OPERATOR_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  defaultNetwork: "hedera_testnet",
  hedera: {
    gasLimit: 3_000_000,
    networks: {
      hedera_testnet: {
        accounts: [
          {
            account: operatorAccount,
            privateKey: operatorKey,
          },
        ],
        chainId: 296,
      },
      hedera_previewnet: {
        accounts: [
          {
            account: operatorAccount,
            privateKey: operatorKey,
          },
        ],
        chainId: 297,
      },
      hedera_mainnet: {
        accounts: [
          {
            account: operatorAccount,
            privateKey: operatorKey,
          },
        ],
        chainId: 295,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
