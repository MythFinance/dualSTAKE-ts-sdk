import { Environment, NetworkConstants } from "./types.js";

export const WEEKS_1 = 86400 * 7;

const prodNetworkConstants: NetworkConstants = {
  maxBalance: 65_000_000 * 1e6, // Minting is disabled after 65M ALGO escrow balance
  upgradePeriod: WEEKS_1, // Contract upgrades must be staged for 1 week
  feeUpdatePeriod: WEEKS_1, // Fee updates apply after 1 week
  feeUpdateMaxDelta: 250, // 2.5% increase/decrease
  ratePrecision: 10000000000, // 1e10
  tm2AppId: 1002541853n,
  arc59AppId: 2449590623n,
};

const devNetworkConstants: NetworkConstants = {
  maxBalance: 65_000_000 * 1e6,
  upgradePeriod: 3600,
  feeUpdatePeriod: 86400,
  feeUpdateMaxDelta: 250,
  ratePrecision: 10000000000,
  tm2AppId: 1n,
  arc59AppId: 1n,
};

export const networkConstants = {
  [Environment.DEV]: devNetworkConstants,
  [Environment.PROD]: prodNetworkConstants,
};
