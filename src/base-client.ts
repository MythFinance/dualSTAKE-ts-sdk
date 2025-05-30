import algosdk from "algosdk";
import { RegistryContractClient as GeneratedRegistryContractClient } from "./generated/registry-contract-client.js";
import { DualStakeContractClient as GeneratedDualStakeContractClient } from "./generated/dualstake-contract-client.js";
import { DualstakePriceOracleClient as GeneratedDualstakePriceOracleClient } from "./generated/dualstake-price-oracle-contract-client.js";
import {
  ContractSchema,
  Environment,
  MakeCreateTransactionsArgs,
  NetworkConstants,
} from "./types.js";
import { compile } from "./utils.js";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

export abstract class BaseClient {
  abstract contractSchema: ContractSchema;

  constructor(
    public client:
      | GeneratedDualStakeContractClient
      | GeneratedRegistryContractClient
      | GeneratedDualstakePriceOracleClient,
    public algorand: AlgorandClient,
    public from: string
  ) {}

  get appId() {
    return this.client.appId;
  }

  get appAddr() {
    return algosdk.getApplicationAddress(this.client.appId);
  }

  get algod(): algosdk.Algodv2 {
    return this.client.algorand.client.algod;
  }

  /*
   * Code construction helpers
   */

  getApprovalSource(
    _env: Environment,
    _overrides?: Partial<NetworkConstants>
  ): string {
    const { approval } = this.client.appSpec.source ?? {};
    if (!approval) {
      throw new Error("approval source not found");
    }
    return Buffer.from(approval, "base64").toString();
  }

  getClearSource(): string {
    const { clear } = this.client.appSpec.source ?? {};
    if (!clear) {
      throw new Error("clear source not found");
    }
    return Buffer.from(clear, "base64").toString();
  }

  compile(env: Environment): Promise<[Uint8Array, Uint8Array]> {
    return Promise.all([
      compile(this.algod, this.getApprovalSource(env)),
      compile(this.algod, this.getClearSource()),
    ]);
  }

  async makeCreateTransactions({
    env,
  }: MakeCreateTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    const [approvalProgram, clearProgram] = await this.compile(env);

    const txns = [];

    const suggestedParams = await this.algod.getTransactionParams().do();

    const upgradeTxn = algosdk.makeApplicationCreateTxnFromObject({
      from: this.from,
      approvalProgram,
      clearProgram,
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      ...this.contractSchema,
    });

    txns.push(upgradeTxn);

    return txns.map((t) => t.get_obj_for_encoding());
  }
}
