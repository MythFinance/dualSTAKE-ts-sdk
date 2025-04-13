import { Environment, NetworkConstants } from "./types.js";

export const WEEKS_2 = 86400 * 7;

const prodNetworkConstants: NetworkConstants = {
  maxBalance: 65_000_000 * 1e6, // Minting is disabled after 65M ALGO escrow balance
  upgradePeriod: WEEKS_2, // Contract upgrades must be staged for 2 weeks
  feeUpdatePeriod: WEEKS_2, // Fee updates apply after 2 weeks
  feeUpdateMaxDelta: 250, // 2.5% increase/decrease
  ratePrecision: 10000000000, // 1e10
  tm2AppId: 1n,
  arc59AppId: 1n,
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
