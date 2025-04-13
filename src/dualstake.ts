import * as algokit from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import pMap from "p-map";
import {
  DSEnvironmentConfig,
  DSContractMapping,
  GetRegistryAppClientArgs,
  DSContractConfig,
  DSContractListing,
} from "./types.js";
import {
  DualStakeContractClient as GeneratedDualStakeContractClient,
  APP_SPEC as DualStakeAppSpec,
} from "./generated/dualstake-contract-client.js";
import { RegistryContractClient as GeneratedRegistryContractClient } from "./generated/registry-contract-client.js";
import { DualStakeClient } from "./dualstake-client.js";
import { DualStakeRegistryClient } from "./registry-client.js";

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
    const appIds = await DualStake.getAvailableContractIDs(config)
    // iterate app IDs, create client and simulate the listing read call
    return DualStake.getContractListings(config, appIds);
  }

  // Get available contracts' listings
  static async getContractListings(
    config: DSEnvironmentConfig,
    appIds: bigint[],
  ): Promise<Map<bigint, DSContractListing>> {
    // get app IDs from registry contract box
    // TODO chunk / pMap
    return DualStake.getRegistryAppClient(config).getContractListings(appIds)
  }
}
