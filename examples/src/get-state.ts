import { AssetBalancesResponse } from "algosdk/dist/types/client/v2/indexer/models/types";
import { DualStake } from "../../dist";
import { registryConfig } from "./config";
import { decimalizeToString } from "./util";

// State is a superset of listing, and includes most state that is useful for a dualSTAKE contract
// Note: does not include APR or farm info

if (!process.argv[2]) {
  throw new Error("Error: dualSTAKE app ID not provided");
}
const appId = BigInt(process.argv[2]);

const client = await DualStake.getContractAppClient({
  ...registryConfig,
  appId,
});

const state = await client.getState();
console.table(state);
