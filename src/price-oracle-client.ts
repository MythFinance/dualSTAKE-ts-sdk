import algosdk, {
  ABIMethod,
  ABITupleType,
  ABIValue,
  indexerModels,
} from "algosdk";
import { Buffer } from "buffer";
import { DualStakeContractClient as GeneratedDualStakeContractClient } from "./generated/dualstake-contract-client.js";
import {
  DSContractConfig,
  DSContractState,
  MakeChangeAdminTransactionsArgs,
  MakeChangeFeeAdminTransactionsArgs,
  MakeChangeNoderunnerTransactionsArgs,
  MakeKeyregOfflineTransactionsArgs,
  MakeKeyregOnlineTransactionsArgs,
  MakeMintTransactionsArgs,
  MakeWithdrawPlatformFeesTransactionsArgs,
  MakeProtestTransactionsArgs,
  MakeRedeemTransactionsArgs,
  MakeSwapTransactionsArgs,
  MakeUndoProtestTransactionsArgs,
  MakeWithdrawNoderunnerFeesTransactionsArgs,
  MakeConfigureTransactionArgs,
  MakeQueueUpdateFeesTransactionsArgs,
  MakeQueueUpgradeTransactionsArgs,
  MakeUpgradeTransactionsArgs,
  MakeDissolveProtestTransactionsArgs,
  DSContractListing,
  MakeAdminUndoProtestTransactionsArgs,
  MakeUpdateMaxBalanceArgs,
  MakeConfigure2TransactionArgs,
  MakeUpdateMaxBalanceTransactionsArgs,
  ParsedArc28EventSpec,
  EmittedArc28Event,
  EmittedArc28EventAndTransaction,
  DSPriceAndTVL,
  DSPriceOracleContractConfig,
} from "./types.js";
import {
  isOptedIn,
  parseFeeUpdate,
  stateToAddress,
  parseContractUpgrade,
  strToUint,
  groupTxns,
  fixContractListing,
  parseArc28EventSpec,
  createMethodSelectorMap,
} from "./utils.js";
import { BaseClient } from "./base-client.js";
import { networkConstants as defaultNetworkConstants } from "./network-constants.js";
import { eventSpec } from "./generated/dualstake.arc28.js";
import {
  DualstakePriceOracleClient as GeneratedDualstakePriceOracleClient,
  PriceAndTvl,
  PriceAndTvlFromTuple,
} from "./generated/dualstake-price-oracle-contract-client.js";

export class DualStakePriceOracleClient extends BaseClient {
  contractSchema = {
    extraPages: 0,
    numGlobalByteSlices: 0,
    numGlobalInts: 0,
    numLocalByteSlices: 0,
    numLocalInts: 0,
  };

  constructor(
    public client: GeneratedDualstakePriceOracleClient,
    public config: DSPriceOracleContractConfig,
    public from: string
  ) {
    super(client, config.algorand, from);
  }

  async getPricesAndTVL(
    listings: DSContractListing[]
  ): Promise<Map<bigint, DSPriceAndTVL>> {
    const appIds = listings.map((a) => (typeof a === "bigint" ? a : a.appId));

    const listingsMap = new Map(
      listings.map((listing) => [listing.appId, listing])
    );

    const { confirmations } = await this.client
      .newGroup()
      .logPricesAndTvl({
        args: {
          appIds,
        },
        staticFee: (1).algos(),
      })
      .simulate({
        allowMoreLogging: true,
        allowUnnamedResources: true,
        extraOpcodeBudget: 170000,
        fixSigners: true,
        allowEmptySignatures: true,
      });

    const tvlStates = new Map<bigint, DSPriceAndTVL>();

    const logs = confirmations[0]!.logs ?? [];
    for (let idx = 0; idx < logs.length; idx++) {
      const appId = appIds[idx];
      const method = this.client.appClient.getABIMethod("get_price_and_tvl");
      const tvlState = PriceAndTvlFromTuple(
        // @ts-ignore
        method.returns.type.decode(logs[idx])
      );
      const listing = listingsMap.get(appId)!;
      tvlStates.set(appId, {
        appId,
        dualStakeAsaId: listing.lstId,
        dualStakeName: listing.lstName,
        pairedAsaId: listing.asaId,
        pairedAsaUnitName: listing.asaUnitName,
        ...tvlState,
      });
    }

    return tvlStates;
  }
}
