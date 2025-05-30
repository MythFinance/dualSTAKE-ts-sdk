import algosdk, { ABIMethod, Algodv2 } from "algosdk";
import { sha512_256 } from "js-sha512";
import {
  BinaryState,
  ContractListing,
  ContractListingFromTuple,
} from "./generated/dualstake-contract-client.js";
import {
  Arc28EventSpec,
  ContractUpgradeState,
  FeeUpdateState,
  NetworkConstants,
  ParsedArc28EventSpec,
} from "./types.js";
import { Arc56Contract } from "@algorandfoundation/algokit-utils/types/app-arc56";

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
  const assetIdNum = Number(assetId);
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

export async function compile(
  algod: Algodv2,
  src: string
): Promise<Uint8Array> {
  const { result } = await algod.compile(src).do();
  return new Uint8Array(Buffer.from(result, "base64"));
}

export function groupTxns(txns: algosdk.Transaction[]) {
  return algosdk
    .assignGroupID(
      txns.map((t) =>
        algosdk.Transaction.from_obj_for_encoding(t.get_obj_for_encoding())
      )
    )
    .map((t) => t.get_obj_for_encoding());
}

export function genLease() {
  const b = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    b[i] = Math.floor(Math.random() * 256);
  }
  return new Uint8Array(b);
}

export function ContractListingFromTupleFixed(
  abiTuple: [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    string,
    bigint,
    string,
    string,
    number,
    boolean,
    boolean,
    boolean,
    boolean,
    bigint
  ]
): ContractListing {
  const listing = ContractListingFromTuple(abiTuple);
  return fixContractListing(listing);
}

export function fixContractListing(listing: ContractListing): ContractListing {
  listing.asaDecimals = Number(listing.asaDecimals);
  return listing;
}

export function mergeMaps<K, V>(...maps: Map<K, V>[]): Map<K, V> {
  const result = new Map<K, V>();
  for (const map of maps) {
    for (const [key, value] of map) {
      result.set(key, value);
    }
  }
  return result;
}

// function logRefs(grp: algosdk.modelsv2.SimulateTransactionGroupResult) {
//   const {
//     accounts = [],
//     apps = [],
//     assets = [],
//     boxes = [],
//   } = grp.unnamedResourcesAccessed ?? {};
//   const acctRefs = accounts.length;
//   const appRefs = apps.length;
//   const assetRefs = assets.length;
//   const boxRefs = boxes.length;
//   console.log({ acctRefs, appRefs, assetRefs, boxRefs });
//   console.log("Total refs:", acctRefs + appRefs + assetRefs + boxRefs);
// }

export function parseArc28EventSpec(e: Arc28EventSpec): ParsedArc28EventSpec {
  // https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0028.md#sample-interpretation-of-event-log-data
  const eventSignature = `${e.name}(${e.args.map((a) => a.type).join(",")})`;
  const eventHash = sha512_256(eventSignature);
  const prefix = eventHash.slice(0, 8);

  return {
    ...e,
    prefix,
  };
}

export function createMethodSelectorMap(
  appSpec: Arc56Contract
): Map<string, ABIMethod> {
  const map = new Map<string, ABIMethod>();
  for (const method of appSpec.methods) {
    const abiMethod = new ABIMethod(method);
    const selector = Buffer.from(abiMethod.getSelector()).toString("base64");
    map.set(selector, abiMethod);
  }
  return map;
}
