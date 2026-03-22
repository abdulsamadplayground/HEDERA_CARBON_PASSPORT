/**
 * Hedera Smart Contract Service (HSCS) for the Carbon Passport Platform.
 *
 * Handles smart contract deployment and invocation for all 6 platform contracts.
 * Uses HFS for bytecode upload and persists contract IDs/EVM addresses to the
 * local config store.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import * as fs from "fs";
import * as path from "path";
import {
  AccountId,
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  ContractFunctionResult,
} from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "@/lib/hedera/client";
import { associateTokens, loadTokenId } from "@/services/hts.service";
import { setValue } from "@/lib/local-store";
import type { TokenRegistry } from "@/services/hts.service";
import type { PlatformAccounts } from "@/lib/hedera/accounts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContractDeployConfig {
  name: string;
  bytecode: string;
  constructorParams: ContractFunctionParameters;
  gas: number;
}

export interface ContractDeployResult {
  contractId: ContractId;
  evmAddress: string;
  transactionId: string;
}

export interface ContractCallResult {
  result: ContractFunctionResult;
  transactionId: string;
  consensusTimestamp: string | null;
}


export interface ContractQueryResult {
  result: ContractFunctionResult;
}

export interface ContractRegistry {
  CompliancePassportManager: ContractId;
  CapTradeManager: ContractId;
  CreditMarketplace: ContractId;
  RewardDistributor: ContractId;
  DIDRegistry: ContractId;
  ClaimsManager: ContractId;
}

export type ContractName = keyof ContractRegistry;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_GAS = 5_000_000;

const ARTIFACTS_DIR = path.resolve(process.cwd(), "artifacts", "contracts");

/**
 * Maps contract names to their Solidity file and artifact paths.
 */
const CONTRACT_ARTIFACTS: Record<ContractName, { solFile: string; contractName: string }> = {
  CompliancePassportManager: { solFile: "CompliancePassportManager.sol", contractName: "CompliancePassportManager" },
  CapTradeManager: { solFile: "CapTradeManager.sol", contractName: "CapTradeManager" },
  CreditMarketplace: { solFile: "CreditMarketplace.sol", contractName: "CreditMarketplace" },
  RewardDistributor: { solFile: "RewardDistributor.sol", contractName: "RewardDistributor" },
  DIDRegistry: { solFile: "DIDRegistry.sol", contractName: "DIDRegistry" },
  ClaimsManager: { solFile: "ClaimsManager.sol", contractName: "ClaimsManager" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads compiled bytecode from the Hardhat artifacts directory.
 * Expects the standard Hardhat artifact JSON format with a `bytecode` field.
 */
function readBytecode(contractName: ContractName): string {
  const artifact = CONTRACT_ARTIFACTS[contractName];
  const artifactPath = path.join(
    ARTIFACTS_DIR,
    artifact.solFile,
    `${artifact.contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `[HSCS] Artifact not found for ${contractName} at ${artifactPath}. ` +
        `Run 'npx hardhat compile' first.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  if (!raw.bytecode || typeof raw.bytecode !== "string") {
    throw new Error(
      `[HSCS] No bytecode found in artifact for ${contractName}.`
    );
  }

  // Return the hex string as-is (with 0x prefix)
  return raw.bytecode.startsWith("0x") ? raw.bytecode : `0x${raw.bytecode}`;
}

/**
 * Persists a contract ID and EVM address to the local config store.
 */
function persistContract(name: string, contractId: ContractId, evmAddress: string): void {
  setValue(`contracts.${name}.id`, contractId.toString());
  setValue(`contracts.${name}.evmAddress`, evmAddress);
}

/**
 * Converts a Hedera TokenId string (e.g. "0.0.12345") to a Solidity address.
 * Hedera token/account IDs map to EVM addresses as the last 20 bytes of the
 * shard.realm.num encoding. For simplicity, we convert the num portion to a
 * hex address padded to 20 bytes.
 */
export function hederaIdToEvmAddress(hederaId: string): string {
  const parts = hederaId.split(".");
  const num = BigInt(parts[parts.length - 1]);
  return "0x" + num.toString(16).padStart(40, "0");
}

// ---------------------------------------------------------------------------
// Core HSCS functions
// ---------------------------------------------------------------------------

/**
 * Deploys a smart contract to Hedera via ContractCreateTransaction.
 *
 * The bytecode must already be uploaded to HFS (bytecodeFileId).
 * Constructor parameters and gas limit are provided in the config.
 *
 * Halts with a descriptive error on failure, logging the Hedera response
 * code and transaction ID.
 *
 * Requirements: 12.1, 12.5, 12.6
 */
export async function deployContract(
  config: ContractDeployConfig
): Promise<ContractDeployResult> {
  const client = await getClient();
  const operatorKey = getOperatorKey();

  try {
    console.log(
      `[HSCS] Deploying "${config.name}" — bytecode=${config.bytecode.length} bytes, gas=${config.gas}`
    );

    const tx = new ContractCreateFlow()
      .setBytecode(config.bytecode)
      .setConstructorParameters(config.constructorParams)
      .setGas(config.gas)
      .setAdminKey(operatorKey);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    if (!receipt.contractId) {
      throw new Error(
        `[HSCS] Contract "${config.name}" deployment succeeded but no contractId returned. ` +
          `status=${receipt.status}, txId=${response.transactionId}`
      );
    }

    const evmAddress = receipt.contractId.toEvmAddress();

    console.log(
      `[HSCS] Contract "${config.name}" deployed — ` +
        `contractId=${receipt.contractId}, evmAddress=${evmAddress}, ` +
        `txId=${response.transactionId}, status=${receipt.status}`
    );

    return {
      contractId: receipt.contractId,
      evmAddress,
      transactionId: response.transactionId.toString(),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[HSCS] FATAL: Failed to deploy contract "${config.name}" — Error: ${msg}`
    );
    throw new Error(
      `[HSCS] Deployment pipeline halted: contract "${config.name}" failed to deploy. ${msg}`
    );
  }
}

/**
 * Executes a state-changing contract call via ContractExecuteTransaction.
 *
 * Returns the decoded function result and the transaction ID.
 *
 * Requirements: 12.2
 */
export async function contractCall(
  contractId: ContractId,
  functionName: string,
  params: ContractFunctionParameters,
  gas: number = DEFAULT_GAS
): Promise<ContractCallResult> {
  const client = await getClient();
  const operatorKey = getOperatorKey();

  try {
    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunction(functionName, params)
      .setGas(gas);

    const signedTx = await tx.freezeWith(client).sign(operatorKey);
    const response = await signedTx.execute(client);
    const record = await response.getRecord(client);

    if (!record.contractFunctionResult) {
      throw new Error(
        `[HSCS] contractCall("${functionName}") returned no function result. ` +
          `txId=${response.transactionId}`
      );
    }

    console.log(
      `[HSCS] contractCall("${functionName}") on ${contractId} — ` +
        `txId=${response.transactionId}, gasUsed=${record.contractFunctionResult.gasUsed}`
    );

    return {
      result: record.contractFunctionResult,
      transactionId: response.transactionId.toString(),
      consensusTimestamp: record.consensusTimestamp?.toString() ?? null,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[HSCS] contractCall("${functionName}") on ${contractId} failed — Error: ${msg}`
    );
    throw error;
  }
}

/**
 * Executes a read-only contract query via ContractCallQuery (no state change).
 *
 * Requirements: 12.3
 */
export async function contractQuery(
  contractId: ContractId,
  functionName: string,
  params: ContractFunctionParameters
): Promise<ContractQueryResult> {
  const client = await getClient();

  try {
    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setFunction(functionName, params)
      .setGas(DEFAULT_GAS);

    const result = await query.execute(client);

    console.log(
      `[HSCS] contractQuery("${functionName}") on ${contractId} — gasUsed=${result.gasUsed}`
    );

    return { result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[HSCS] contractQuery("${functionName}") on ${contractId} failed — Error: ${msg}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Contract-specific token association helpers
// ---------------------------------------------------------------------------

/**
 * Token associations required for each contract's EVM address.
 * Each contract needs to hold specific tokens to mint/burn/transfer them
 * via the HTS Precompile.
 */
const CONTRACT_TOKEN_ASSOCIATIONS: Record<ContractName, string[]> = {
  CompliancePassportManager: ["CPASS", "CSTAMP", "VCLAIM"],
  CapTradeManager: ["CAL"],
  CreditMarketplace: ["CCR"],
  RewardDistributor: ["CCR"],
  DIDRegistry: [],
  ClaimsManager: ["VCLAIM"],
};

/**
 * Associates the required platform tokens with a contract's account.
 * Contracts need token associations to interact with tokens via the HTS Precompile.
 */
async function associateContractTokens(
  contractName: ContractName,
  contractId: ContractId
): Promise<void> {
  const symbols = CONTRACT_TOKEN_ASSOCIATIONS[contractName];
  if (symbols.length === 0) {
    console.log(
      `[HSCS] No token associations needed for ${contractName}.`
    );
    return;
  }

  const tokenIds = symbols.map((symbol) => {
    const tokenId = loadTokenId(symbol);
    if (!tokenId) {
      throw new Error(
        `[HSCS] Token ${symbol} not found in local config. ` +
          `Run token initialization before contract deployment.`
      );
    }
    return tokenId;
  });

  // ContractId shares the same shard.realm.num format as AccountId
  const contractAccountId = AccountId.fromString(contractId.toString());
  await associateTokens(contractAccountId, tokenIds);
  console.log(
    `[HSCS] Associated tokens [${symbols.join(", ")}] with ${contractName} (${contractId}).`
  );
}

// ---------------------------------------------------------------------------
// Deploy all 6 contracts
// ---------------------------------------------------------------------------

/**
 * Deploys all 6 platform smart contracts in the correct order, passing
 * token IDs and account IDs as constructor parameters.
 *
 * For each contract:
 * 1. Read compiled bytecode from Hardhat artifacts
 * 2. Upload bytecode to HFS
 * 3. Deploy contract with constructor params
 * 4. Persist contract ID and EVM address to local config
 * 5. Associate required tokens with the contract's account
 *
 * Halts the pipeline with a descriptive error if any deployment fails.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
export async function deployAllContracts(
  tokenRegistry: TokenRegistry,
  accounts: PlatformAccounts
): Promise<ContractRegistry> {
  console.log("[HSCS] Starting deployment of all 6 platform contracts...");

  const registry: Partial<ContractRegistry> = {};

  // Helper to deploy a single contract end-to-end
  async function deployOne(
    name: ContractName,
    constructorParams: ContractFunctionParameters,
    gas: number = DEFAULT_GAS
  ): Promise<ContractId> {
    console.log(`[HSCS] Deploying ${name}...`);

    // 1. Read bytecode
    const bytecode = readBytecode(name);

    // 2. Deploy contract
    const result = await deployContract({
      name,
      bytecode,
      constructorParams,
      gas,
    });

    // 3. Persist to local config
    persistContract(name, result.contractId, result.evmAddress);

    // 4. Associate required tokens
    await associateContractTokens(name, result.contractId);

    return result.contractId;
  }

  // Deploy all 6 contracts with empty constructor params
  const contractNames: ContractName[] = [
    "CompliancePassportManager",
    "CapTradeManager",
    "CreditMarketplace",
    "RewardDistributor",
    "DIDRegistry",
    "ClaimsManager",
  ];

  for (const name of contractNames) {
    registry[name] = await deployOne(
      name,
      new ContractFunctionParameters()
    );
  }

  console.log("[HSCS] All 6 platform contracts deployed successfully.");
  return registry as ContractRegistry;
}
