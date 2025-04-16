import algosdk, { Algodv2 } from "algosdk";
import { BinaryState, ContractListing, ContractListingFromTuple } from "./generated/dualstake-contract-client.js";
import {
  ContractUpgradeState, FeeUpdateState,
  NetworkConstants
} from "./types.js";

export function strToUint(str: string) {
  return new Uint8Array(Buffer.from(str));
}

export function uintToStr(u: Uint8Array) {
  return Buffer.from(u).toString();
}

export async function isOptedIn(
  algod: algosdk.Algodv2,
  user: string,
  assetId: bigint
): Promise<boolean> {
  const accountInformation = await algod.accountInformation(user).do();
  const assetIdNum = Number(assetId)
  const asset = accountInformation.assets.find(
    ({ "asset-id": aid }: { "asset-id": number }) => aid === assetIdNum
  );
  return !!asset;
}

export function parseFeeUpdate(state: BinaryState): FeeUpdateState | null {
  const value = state.asByteArray()!;
  if (!value || !value.length) return null;
  return {
    applicableTimestamp: algosdk.decodeUint64(value.slice(0, 8), "safe"),
    nextNoderunnerFeeBps: algosdk.decodeUint64(value.slice(8, 16), "safe"),
    nextPlatformFeeBps: algosdk.decodeUint64(value.slice(16, 24), "safe"),
  };
}

export function parseContractUpgrade(
  state: BinaryState
): ContractUpgradeState | null {
  const value = state.asByteArray()!;
  if (!value || !value.length) return null;
  const contractPageHashes = chunk(Array.from(value.slice(4)), 32).map(
    (chunk) => Buffer.from(chunk).toString("hex")
  );
  return {
    applicableTimestamp: algosdk.decodeUint64(value.slice(0, 4), "safe"),
    contractPageHashes,
  };
}

export function stateToAddress(state: BinaryState): string {
  return algosdk.encodeAddress(state.asByteArray()!);
}

export function chunk<T>(elems: T[], num = 20): T[][] {
  return elems.reduce(
    (out: T[][], cur: T) => {
      let last = out[out.length - 1];
      if (last.length == num) {
        out.push([]);
        last = out[out.length - 1];
      }
      last.push(cur);
      return out;
    },
    [[]] as T[][]
  );
}

export function replaceTemplateVars(
  approval: string,
  templateVarMap: NetworkConstants,
  overrides?: Partial<NetworkConstants>
): string {
  let out = approval;
  const finalTemplateVarMap = { ...templateVarMap, ...overrides };
  for (const [key, value] of Object.entries(finalTemplateVarMap)) {
    const regex = new RegExp(`TMPL_${key}`, "gm");
    out = out.replace(regex, String(value));
  }
  return out;
}

export async function compile(algod: Algodv2, src: string): Promise<Uint8Array> {
  const { result }  = await algod.compile(src).do();
  return new Uint8Array(Buffer.from(result, 'base64'));
}

export function groupTxns(txns: algosdk.Transaction[]) {
  return algosdk.assignGroupID(
    txns.map((t) =>
      algosdk.Transaction.from_obj_for_encoding(t.get_obj_for_encoding())
    )
  ).map((t) => t.get_obj_for_encoding())
}

export function genLease() {
  const b = Buffer.alloc(32);
  for(let i=0; i<32; i++) {
      b[i] = Math.floor(Math.random() * 256);
  }
  return new Uint8Array(b);
}

export function ContractListingFromTupleFixed(abiTuple: [bigint, bigint, bigint, bigint, bigint, string, bigint, string, string, number, boolean, boolean, boolean, boolean, bigint]): ContractListing {
  const listing = ContractListingFromTuple(abiTuple)
  return fixContractListing(listing);
}

export function fixContractListing(listing: ContractListing): ContractListing {
  listing.asaDecimals = Number(listing.asaDecimals)
  return listing
}