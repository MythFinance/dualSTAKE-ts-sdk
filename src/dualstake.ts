import * as algokit from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import pMap from "p-map";
import {
  DSEnvironmentConfig,
  DSContractMapping,
  GetRegistryAppClientArgs,
  DSContractConfig,
  DSContractListing,
  DSPriceAndTVL,
  DSPriceOracleContractConfig,
} from "./types.js";
import {
  DualStakeContractClient as GeneratedDualStakeContractClient,
  APP_SPEC as DualStakeAppSpec,
} from "./generated/dualstake-contract-client.js";
import { RegistryContractClient as GeneratedRegistryContractClient } from "./generated/registry-contract-client.js";
import { DualStakeClient } from "./dualstake-client.js";
import { DualStakeRegistryClient } from "./registry-client.js";
import { chunk, mergeMaps } from "./utils.js";
import {
  DualstakePriceOracleClient as GeneratedDualstakePriceOracleClient,
  PriceAndTvl,
} from "./generated/dualstake-price-oracle-contract-client.js";
import { DualStakePriceOracleClient } from "./price-oracle-client.js";

export class DualStake {
  // simulate request concurrency
  static REQUEST_CONCURRENCY = 4;

  // Get algokit generated client for registry app
  static getRegistryAppClient({
    algorand,
    dsRegistryAppId,
    sender,
  }: GetRegistryAppClientArgs) {
    const generatedClient = new GeneratedRegistryContractClient({
      algorand,
      appId: BigInt(dsRegistryAppId),
      defaultSender: sender,
      defaultSigner: algosdk.makeEmptyTransactionSigner(),
    });
    return new DualStakeRegistryClient(generatedClient, algorand, sender);
  }

  // Get algokit generated client for registry app
  static getContractAppClient(config: DSContractConfig) {
    const { appId, sender } = config;
    const generatedClient = new GeneratedDualStakeContractClient({
      algorand: config.algorand,
      appId: BigInt(appId),
      defaultSender: sender,
      defaultSigner: algosdk.makeEmptyTransactionSigner(),
    });
    return new DualStakeClient(generatedClient, config, sender);
  }

  // Get available contracts' mapping of pairedAsaId - lstAsaId - dualStakeAppId
  static async getAvailableContractIDs(
    config: DSEnvironmentConfig
  ): Promise<bigint[]> {
    const { algorand, dsRegistryAppId, sender } = config;
    return DualStake.getRegistryAppClient({
      algorand,
      dsRegistryAppId,
      sender,
    }).getAvailableContractIDs();
  }

  // Get available contracts' mapping of pairedAsaId - lstAsaId - dualStakeAppId
  static async getAvailableContracts(
    config: DSEnvironmentConfig
  ): Promise<DSContractMapping[]> {
    const { algorand, dsRegistryAppId, sender } = config;
    return DualStake.getRegistryAppClient({
      algorand,
      dsRegistryAppId,
      sender,
    }).getAvailableContracts();
  }

  // Get available contracts' listings
  static async getAvailableContractListings(
    config: DSEnvironmentConfig
  ): Promise<Map<bigint, DSContractListing>> {
    // get app IDs from registry contract box
    const appIds = await DualStake.getAvailableContractIDs(config);
    // iterate app IDs, create client and simulate the listing read call
    return DualStake.getContractListings(config, appIds);
  }

  // Get available contracts' listings
  static async getContractListings(
    config: DSEnvironmentConfig,
    appIds: bigint[]
  ): Promise<Map<bigint, DSContractListing>> {
    // get app IDs from registry contract box
    const chunks = chunk(appIds, 32);
    const client = DualStake.getRegistryAppClient(config);
    const data = await Promise.all(
      chunks.map((appIds) => client.getContractListings(appIds))
    );
    return mergeMaps(...data);
  }

  // Get algokit generated client for price oracle app
  static getPriceOracleAppClient(config: DSPriceOracleContractConfig) {
    const { priceOracleAppId, sender } = config;
    const generatedClient = new GeneratedDualstakePriceOracleClient({
      algorand: config.algorand,
      appId: BigInt(priceOracleAppId),
      defaultSender: sender,
      defaultSigner: algosdk.makeEmptyTransactionSigner(),
    });
    return new DualStakePriceOracleClient(generatedClient, config, sender);
  }

  static async getAvailablePricesAndTVL(
    config: DSPriceOracleContractConfig
  ): Promise<Map<bigint, DSPriceAndTVL>> {
    const listings = await DualStake.getAvailableContractListings(config);
    return DualStake.getPricesAndTVL(config, [...listings.values()]);
  }

  static async getPricesAndTVL(
    config: DSPriceOracleContractConfig,
    appIdsOrListings: (bigint | DSContractListing)[]
  ): Promise<Map<bigint, DSPriceAndTVL>> {
    const appIds = appIdsOrListings.map((a) =>
      typeof a === "bigint" ? a : a.appId
    );
    const listingsHave = appIdsOrListings.filter((a) => typeof a !== "bigint");
    const listingsNeed = appIdsOrListings.filter((a) => typeof a === "bigint");
    const listingsMap = new Map<bigint, DSContractListing>(
      listingsHave.map((listing) => [listing.appId, listing])
    );
    if (listingsNeed.length) {
      const { priceOracleAppId, ...envConfig } = config;
      const missingListings = await DualStake.getContractListings(
        envConfig,
        listingsNeed
      );
      for (const missingListing of missingListings.values()) {
        listingsMap.set(missingListing.appId, missingListing);
      }
    }
    const chunks = chunk(appIds, 42);
    const client = DualStake.getPriceOracleAppClient(config);
    const data = await Promise.all(
      chunks.map((appIds) => client.getPricesAndTVL([...listingsMap.values()]))
    );
    return mergeMaps(...data);
  }
}
