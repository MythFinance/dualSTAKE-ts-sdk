import algosdk, { ABIMethod } from "algosdk";
import { RegistryContractClient as GeneratedRegistryContractClient } from "./generated/registry-contract-client.js";
import {
  ContractListing,
  ContractListingFromTuple,
} from "./generated/dualstake-contract-client.js";
import {
  DSContractListing,
  DSContractMapping,
  MakeAssignContractTransactionsArgs,
  MakeUnassignContractTransactionsArgs,
  MakeVanityConfigureTransactionArgs,
} from "./types.js";
import { BaseClient } from "./base-client.js";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { ContractListingFromTupleFixed, genLease, groupTxns, strToUint } from "./utils.js";
import { DualStakeClient } from "./dualstake-client.js";
import { GeneratedDualStakeContractClient } from "./index.js";

export class DualStakeRegistryClient extends BaseClient {
  private getContractListingABImethod: ABIMethod

  contractSchema = {
    extraPages: 3,
    numGlobalByteSlices: 24,
    numGlobalInts: 40,
    numLocalByteSlices: 0,
    numLocalInts: 0,
  };

  constructor(
    public client: GeneratedRegistryContractClient,
    public algorand: AlgorandClient,
    public from: string
  ) {
    super(client, algorand, from);

    this.getContractListingABImethod = new GeneratedDualStakeContractClient({
      algorand,
      appId: 13n,
    }).appClient.getABIMethod("get_contract_listing");
  }

  async getAvailableContractIDs(): Promise<bigint[]> {
    const data = await this.client.appClient.getBoxNames();
    return data
      .filter(({ nameRaw: n }) => n.length === 9)
      .map(({ nameRaw }) => {
        return algosdk.decodeUint64(nameRaw.slice(1), "bigint");
      });
  }

  async getAvailableContracts(): Promise<DSContractMapping[]> {
    const data = await this.client.appClient.getBoxValues();
    return data
      .filter(({ name: { nameRaw: n } }) => n.length === 8)
      .map(({ name: { nameRaw }, value }) => {
        const asaId = algosdk.decodeUint64(nameRaw, "bigint");
        const lstId = algosdk.decodeUint64(value.slice(0, 8), "bigint");
        const appId = algosdk.decodeUint64(value.slice(8, 16), "bigint");
        return { asaId, appId, lstId };
      });
  }

  async getContractListings(
    appIds: bigint[]
  ): Promise<Map<bigint, DSContractListing>> {
    const {
      confirmations: [{ logs }],
      simulateResponse: { lastRound },
    } = await this.client
      .newGroup()
      .logDualstakeListings({ args: { appIds } })
      .simulate({
        allowUnnamedResources: true,
        extraOpcodeBudget: 170013,
        fixSigners: true,
        allowEmptySignatures: true,
        allowMoreLogging: true,
      });

    const round = BigInt(lastRound);

    const retMap = new Map<bigint, DSContractListing>();

    for (let idx = 0; idx < logs!.length; idx++) {
      const appId = appIds[idx];

      // get_state is another method, returns a single State
      // used later to break up log line into tuples
      // .appClient.getABIMethod("get_state");

      const listing = ContractListingFromTupleFixed(
        // this parses the State return type to a tuple. it messes up some number<->bigint so I need to patch the types later
        // @ts-ignore
        this.getContractListingABImethod.returns.type.decode(logs[idx])
        // @ts-ignore
      ) as unknown as ContractListing;

      retMap.set(appId, { appId, round, ...listing });
    }

    return retMap;
  }

  async makeAssignContractTransactions({
    asaId,
    appId,
  }: MakeAssignContractTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const txns = [];

    const suggestedParams = await this.algod.getTransactionParams().do();

    // fund box mbr
    txns.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.from,
        to: this.appAddr,
        amount: 12100,
        suggestedParams,
      })
    );

    const appBox = new Uint8Array([
      "a".charCodeAt(0),
      ...algosdk.encodeUint64(appId),
    ]);

    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.assignContract({
      args: {},
      appReferences: [BigInt(appId)],
      boxReferences: [
        { appId: BigInt(0), name: algosdk.encodeUint64(asaId) },
        appBox,
      ],
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }

  async makeUnassignContractTransactions({
    asaId,
    appId,
  }: MakeUnassignContractTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const txns = [];

    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.unassignContract({
      args: {
        key: algosdk.encodeUint64(asaId),
      },
      appReferences: [BigInt(appId)],
      boxReferences: [
        { appId: BigInt(0), name: algosdk.encodeUint64(asaId) },
        {
          appId: BigInt(0),
          name: new Uint8Array([
            "a".charCodeAt(0),
            ...algosdk.encodeUint64(appId),
          ]),
        },
      ],
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }

  async makeVanityConfigureTransaction({
    dsAppId,
    lstAsaName,
    lstUnitName,
    lstUrl,
  }: MakeVanityConfigureTransactionArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const txns = [];

    const suggestedParams = await this.algod.getTransactionParams().do();

    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.vanityConfigure({
      args: {
        appId: dsAppId,
        lstAsaName: strToUint(lstAsaName),
        lstUnitName: strToUint(lstUnitName),
        lstUrl: strToUint(lstUrl),
      },
      lease: genLease(),
      appReferences: [BigInt(dsAppId)],
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }
}
