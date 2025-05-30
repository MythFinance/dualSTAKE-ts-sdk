import { AlgorandClient, getIndexerConfigFromEnvironment } from "@algorandfoundation/algokit-utils";
import { ABIValue, indexerModels } from "algosdk";
import { PriceAndTvl } from "./generated/dualstake-price-oracle-contract-client.js";

export interface ContractSchema {
  extraPages: number;
  numGlobalByteSlices: number;
  numGlobalInts: number;
  numLocalByteSlices: number;
  numLocalInts: number;
}

export interface NetworkConstants {
  maxBalance: number;
  upgradePeriod: number;
  feeUpdatePeriod: number;
  feeUpdateMaxDelta: number;
  ratePrecision: number;
  tm2AppId: bigint;
  arc59AppId: bigint;
}

export enum Environment {
  "DEV" = "DEV",
  "PROD" = "PROD",
}

export interface DSEnvironmentConfig {
  sender: string;
  algorand: AlgorandClient;
  network: string;
  dsRegistryAppId: bigint;
  tinymanAppId: bigint;
  arc59RouterAppId: bigint;
}

export type GetRegistryAppClientArgs = Pick<
  DSEnvironmentConfig,
  "dsRegistryAppId" | "sender" | "algorand"
>;

export interface DSContractConfig extends DSEnvironmentConfig {
  appId: bigint;
}

export interface DSPriceOracleContractConfig extends DSEnvironmentConfig {
  priceOracleAppId: bigint;
}

export interface DSContractMapping {
  asaId: bigint;
  appId: bigint;
  lstId: bigint;
}

export interface DSPriceAndTVL extends PriceAndTvl {
  // dualSTAKE app ID
  appId: bigint;
  // dualSTAKE ASA ID
  dualStakeAsaId: bigint;
  // dualSTAKE ASA asset name
  dualStakeName: string;
  // Paired ASA ID
  pairedAsaId: bigint;
  // Paired ASA unit name
  pairedAsaUnitName: string;
}

export interface Arc28EventSpec {
  name: string
  args: Array<{
    type: string
    name: string
  }>
}

export interface ParsedArc28EventSpec extends Arc28EventSpec {
  prefix: string
}

export interface EmittedArc28Event {
  spec: ParsedArc28EventSpec;
  args: ABIValue[];
  argsByName: Record<string, ABIValue>;
}

export interface EmittedArc28EventAndTransaction extends EmittedArc28Event {
  outerTransaction: indexerModels.Transaction
  logTransaction: indexerModels.Transaction
}

export interface FeeUpdateState {
  applicableTimestamp: number;
  nextNoderunnerFeeBps: number;
  nextPlatformFeeBps: number;
}

export interface ContractUpgradeState {
  applicableTimestamp: number;
  contractPageHashes: string[];
}

export interface DSContractListing {
  round: bigint;
  appId: bigint;
  rate: bigint;
  algoBalance: bigint;
  asaBalance: bigint;
  staked: bigint;
  lstId: bigint;
  lstName: string;
  asaId: bigint;
  asaName: string;
  asaUnitName: string;
  asaDecimals: number;
  needSwap: boolean;
  incentiveEligible: boolean;
  isOnline: boolean;
  upgrading: boolean;
  userProtestingStake: bigint;
}

export interface DSContractState extends DSContractListing {
  version: bigint;
  platformFees: bigint;
  noderunnerFees: bigint;
  platformFeeBps: bigint;
  noderunnerFeeBps: bigint;
  adminAddr: string;
  feeAdminAddr: string;
  noderunnerAddr: string;
  lpType: string;
  lpId: string;
  delayOptin: boolean;
  feeUpdate: null | FeeUpdateState;
  contractUpgrade: null | ContractUpgradeState;
  protestCount: bigint;
  protestSum: bigint;
  tinymanAppId: bigint;
  arc59AppId: bigint;
  maxBalance: bigint;
  ratePrecision: bigint;
  upgradePeriod: bigint;
  feeUpdatePeriod: bigint;
  feeUpdateMaxDelta: bigint;
}

export interface MakeTransactionBaseArgs {}

export interface MakeMintTransactionsArgs extends MakeTransactionBaseArgs {
  algoAmount: number;
}

export interface MakeRedeemTransactionsArgs extends MakeTransactionBaseArgs {
  amount: number;
}

export interface MakeSwapTransactionsArgs extends MakeTransactionBaseArgs {}

export interface MakeProtestTransactionsArgs extends MakeTransactionBaseArgs {
  amount: number;
}

export interface MakeUndoProtestTransactionsArgs
  extends MakeTransactionBaseArgs {}

export interface MakeAdminUndoProtestTransactionsArgs
  extends MakeTransactionBaseArgs {
  user: string;
}
export interface MakeDissolveProtestTransactionsArgs
  extends MakeTransactionBaseArgs {
  user: string;
}

export interface MakeKeyregOnlineTransactionsArgs
  extends MakeTransactionBaseArgs {
  selectionKey: Uint8Array;
  votingKey: Uint8Array;
  spKey: Uint8Array;
  firstRound: number;
  lastRound: number;
  keyDilution: number;
  fee: number;
}

export interface MakeKeyregOfflineTransactionsArgs
  extends MakeTransactionBaseArgs {}

export interface MakeWithdrawNoderunnerFeesTransactionsArgs
  extends MakeTransactionBaseArgs {
  amount?: number;
}

export interface MakeWithdrawPlatformFeesTransactionsArgs
  extends MakeTransactionBaseArgs {
  amount?: number;
}

export interface MakeChangeNoderunnerTransactionsArgs
  extends MakeTransactionBaseArgs {
  noderunner: string;
}

export interface MakeChangeFeeAdminTransactionsArgs
  extends MakeTransactionBaseArgs {
  feeAdmin: string;
}

export interface MakeChangeAdminTransactionsArgs
  extends MakeTransactionBaseArgs {
  admin: string;
}

export interface MakeUpdateMaxBalanceArgs {
  newMaxBalance: number;
}

export type MakeConfigureTransactionArgs = MakeTransactionBaseArgs & {
  env: Environment;
  asaId: bigint;
  lpType: "tm2";
  lpId: string;
  platformFeeBps: number;
  noderunnerFeeBps: number;
  adminAddr: string;
  feeAdminAddr: string;
  noderunnerAddr: string;
  delayOptin: boolean;
} & Partial<NetworkConstants>

export type MakeConfigure2TransactionArgs = MakeTransactionBaseArgs & {
  lstAsaName: string;
  lstUnitName: string;
  lstUrl: string;
} & Partial<NetworkConstants>


export type MakeVanityConfigureTransactionArgs = MakeConfigure2TransactionArgs & {
  dsAppId: bigint;
}

export interface MakeQueueUpdateFeesTransactionsArgs
  extends MakeTransactionBaseArgs {
  newPlatformFeeBps: number;
  newNoderunnerFeeBps: number;
}

export interface MakeAssignContractTransactionsArgs {
  appId: bigint;
  asaId: bigint;
}

export interface MakeUnassignContractTransactionsArgs {
  appId: bigint;
  asaId: bigint;
}

export interface MakeQueueUpgradeTransactionsArgs {
  hashes: Uint8Array[];
}

export interface MakeUpdateMaxBalanceTransactionsArgs {
  newMaxBalance: bigint;
}

export interface MakeUpgradeTransactionsArgs {
  approvalProgram: Uint8Array;
  clearProgram: Uint8Array;
}

export interface MakeCreateTransactionsArgs {
  env: Environment;
}
