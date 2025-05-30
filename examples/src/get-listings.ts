import { AssetBalancesResponse } from "algosdk/dist/types/client/v2/indexer/models/types";
import { DualStake } from "../../dist";
import { registryConfig } from "./config";
import { decimalizeToString } from "./util";

// "Listing" is a brief-ish view of dualSTAKE contracts
// It includes all data required to render an index page

const data = await DualStake.getAvailableContractListings(registryConfig);
// Map<bigint => DSContractListing>

// sort highest to lowest stake
const sorted = [...data.values()].sort(({ staked: a }, { staked: b }) =>
  a < b ? 1 : -1
);
// uncomment to inspect
console.log("Sample");
console.table(sorted[0]);

console.log("Table");
const table = Object.fromEntries(
  sorted.map(
    ({
      lstName,
      appId,
      lstId,
      staked,
      asaId,
      asaBalance,
      asaDecimals,
      asaUnitName,
    }) => [
      lstName,
      {
        "dS app ID": appId,
        "dS ASA ID": lstId,
        staked: decimalizeToString(staked) + " ALGO",
        "Paired ASA ID": asaId,
        "Paired ASA Balance":
          decimalizeToString(asaBalance, asaDecimals, asaDecimals) +
          " " +
          asaUnitName,
      },
    ]
  )
);
console.table(table);
