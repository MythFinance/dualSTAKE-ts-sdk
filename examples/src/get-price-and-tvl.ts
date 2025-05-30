import { DualStake } from "../../dist";
import { priceOracleConfig } from "./config";
import { decimalizeToString } from "./util";

// get available prices and TVL for *all* dualSTAKE contracts/tokens
const priceMap = await DualStake.getAvailablePricesAndTVL(priceOracleConfig);

// sort highest to lowest TVL
const sortedPriceData = [...priceMap.values()].sort(
  ({ totalTvlInAlgo: a }, { totalTvlInAlgo: b }) => (a < b ? 1 : -1)
);

console.log("Sample")
console.table(sortedPriceData[0]);

// build up summary table
const summary = {
  "Total TVL":
    decimalizeToString(
      sortedPriceData.reduce(
        (sum, { totalTvlInAlgo }) => sum + totalTvlInAlgo,
        BigInt(0)
      )
    ) + " ALGO",
  "Total ALGO TVL":
    decimalizeToString(
      sortedPriceData.reduce((sum, { algoTvlInAlgo }) => sum + algoTvlInAlgo, BigInt(0))
    ) + " ALGO",
  "Total ASA TVL":
    decimalizeToString(
      sortedPriceData.reduce((sum, { asaTvlInAlgo }) => sum + asaTvlInAlgo, BigInt(0))
    ) + " ALGO",
};
console.log("Summary")
console.table(summary);

const table = Object.fromEntries(
  sortedPriceData.map((p) => [
    p.dualStakeName,
    {
      "Price (ALGO)": decimalizeToString(p.dualstakeUnitPriceInAlgo, 6, 4),
      "Total TVL (ALGO)": decimalizeToString(p.totalTvlInAlgo),
      "ALGO TVL": decimalizeToString(p.algoTvlInAlgo),
      "ASA TVL (ALGO)": decimalizeToString(p.asaTvlInAlgo),
    },
  ])
);
console.log("Table")
console.table(table);
