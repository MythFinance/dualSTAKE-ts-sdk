import {
  DSPriceOracleContractConfig,
  DSEnvironmentConfig,
} from "@myth-finance/dualstake-ts-sdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";

const algod = new algosdk.Algodv2(
  "",
  "https://mainnet-api.4160.nodely.dev",
  "443"
);

const algorand = AlgorandClient.fromClients({ algod }) as unknown as DSEnvironmentConfig["algorand"];

export const registryConfig: DSEnvironmentConfig = {
  algorand,
  arc59RouterAppId: 2449590623n,
  tinymanAppId: 1002541853n,
  network: "mainnet",
  dsRegistryAppId: 2933409454n,
  // simulate sender; fee sink
  sender: "A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE",
};

export const priceOracleConfig: DSPriceOracleContractConfig = {
  ...registryConfig,
  priceOracleAppId: 3021936666n,
};
