# dualSTAKE TypeScript SDK

TypeScript SDK to interact with [dualSTAKE](https://docs.myth.finance/dualSTAKE) contracts.

This SDK is feature-complete and is used by the Myth Finance frontend, as well as internal CLI tooling.

It requires JS algosdk v2 and algokit-utils-ts v7.

The documentation is currently very sparse.

For the time being, you can explore the `examples/` folder to get a sense of some available read operations.

## Examples

Install requirements:

```
cd examples
npm i
```

Get contract listings:

```
tsx src/get-listings.ts
```

Get full contract state for dualSTAKE app ID 123:

```
tsx src/get-state.ts 123
```

Get dualSTAKE token price and TVL data:

```
tsx src/get-price-and-tvl.ts
```
