import { APP_SPEC as DualStakeAppSpec } from "./generated/dualstake-contract-client.js";

export { RegistryContractClient as GeneratedRegistryContractClient } from "./generated/registry-contract-client.js";
export { DualStakeContractClient as GeneratedDualStakeContractClient } from "./generated/dualstake-contract-client.js";

export * from "./types.js";
export * from "./network-constants.js";
export * from "./dualstake.js";
export * from "./dualstake-client.js";
export * from "./registry-client.js";

export const APP_SPEC = DualStakeAppSpec;