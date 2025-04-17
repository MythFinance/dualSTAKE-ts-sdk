import algosdk from "algosdk";
import { Buffer } from "buffer";
import { DualStakeContractClient as GeneratedDualStakeContractClient } from "./generated/dualstake-contract-client.js";
import {
  DSContractConfig,
  DSContractState,
  MakeChangeAdminTransactionsArgs,
  MakeChangeFeeAdminTransactionsArgs,
  MakeChangeNoderunnerTransactionsArgs,
  MakeKeyregOfflineTransactionsArgs,
  MakeKeyregOnlineTransactionsArgs,
  MakeMintTransactionsArgs,
  MakeWithdrawPlatformFeesTransactionsArgs,
  MakeProtestTransactionsArgs,
  MakeRedeemTransactionsArgs,
  MakeSwapTransactionsArgs,
  MakeUndoProtestTransactionsArgs,
  MakeWithdrawNoderunnerFeesTransactionsArgs,
  MakeConfigureTransactionArgs,
  MakeQueueUpdateFeesTransactionsArgs,
  MakeQueueUpgradeTransactionsArgs,
  MakeUpgradeTransactionsArgs,
  MakeDissolveProtestTransactionsArgs,
  DSContractListing,
  MakeAdminUndoProtestTransactionsArgs,
  MakeUpdateMaxBalanceArgs,
  MakeConfigure2TransactionArgs,
  MakeUpdateMaxBalanceTransactionsArgs,
} from "./types.js";
import {
  uintToStr,
  isOptedIn,
  parseFeeUpdate,
  stateToAddress,
  parseContractUpgrade,
  strToUint,
  groupTxns,
  fixContractListing,
} from "./utils.js";
import { BaseClient } from "./base-client.js";
import { networkConstants as defaultNetworkConstants } from "./network-constants.js";

export class DualStakeClient extends BaseClient {
  asaId?: bigint;
  lstId?: bigint;

  contractSchema = {
    extraPages: 3,
    numGlobalByteSlices: 24,
    numGlobalInts: 40,
    numLocalByteSlices: 0,
    numLocalInts: 0,
  };

  constructor(
    public client: GeneratedDualStakeContractClient,
    public config: DSContractConfig,
    public from: string
  ) {
    super(client, config.algorand, from);
  }

  async init() {
    if (!this.asaId) {
      await this.getListing();
    }
  }

  /*
   * read state methods
   */

  async getListing(): Promise<DSContractListing> {
    const res = await this.client.newGroup().getContractListing({
      args: {
        user: this.config.sender,
      }
    }).simulate({
      allowUnnamedResources: true,
      extraOpcodeBudget: 5500,
      fixSigners: true,
      allowEmptySignatures: true,
    });

    const listing = fixContractListing(res.returns[0]!);

    this.asaId = listing.asaId;
    this.lstId = listing.lstId;

    return {
      round: BigInt(res.simulateResponse.lastRound),
      appId: this.appId,
      ...listing,
    };
  }

  async getRate(): Promise<bigint> {
    const response = await this.client.newGroup().getRate().simulate({
      allowUnnamedResources: true,
      fixSigners: true,
      allowEmptySignatures: true,
    });
    return response.returns[0]!;
  }

  async getNeedSwap(): Promise<boolean> {
    const res = await this.client.newGroup().getNeedSwap().simulate({
      allowUnnamedResources: true,
      extraOpcodeBudget: 1300,
      fixSigners: true,
      allowEmptySignatures: true,
    });
    return res.returns[0]!;
  }

  async getState(): Promise<DSContractState> {
    const [state, listing] = await Promise.all([
      this.client.state.global.getAll(),
      this.getListing(),
    ]);
    const {
      version,
      asaId,
      lstId,
      staked,
      platformFees,
      noderunnerFees,
      platformFeeBps,
      noderunnerFeeBps,
      adminAddr,
      feeAdminAddr,
      noderunnerAddr,
      lpType,
      lpId,
      delayOptin,
      feeUpdate,
      contractUpgrade,
      protestCount,
      protestSum,
      tm2AppId,
      arc59AppId,
      feeUpdateMaxDelta,
      feeUpdatePeriod,
      maxBalance,
      ratePrecision,
      upgradePeriod,
    } = state;

    return {
      ...listing,
      version: version!,
      asaId: asaId!,
      lstId: lstId!,
      staked: staked!,
      platformFees: platformFees!,
      noderunnerFees: noderunnerFees!,
      platformFeeBps: platformFeeBps!,
      noderunnerFeeBps: noderunnerFeeBps!,
      protestCount: protestCount!,
      protestSum: protestSum!,
      delayOptin: Boolean(delayOptin),
      adminAddr: stateToAddress(adminAddr!),
      feeAdminAddr: stateToAddress(feeAdminAddr!),
      noderunnerAddr: stateToAddress(noderunnerAddr!),
      lpType: lpType!.asString()!,
      lpId: stateToAddress(lpId!),
      ratePrecision: ratePrecision!,
      maxBalance: maxBalance!,
      feeUpdate: parseFeeUpdate(feeUpdate!),
      feeUpdateMaxDelta: feeUpdateMaxDelta!,
      feeUpdatePeriod: feeUpdatePeriod!,
      contractUpgrade: parseContractUpgrade(contractUpgrade!),
      upgradePeriod: upgradePeriod!,
      tinymanAppId: tm2AppId!,
      arc59AppId: arc59AppId!,
    };
  }

  /*
   * Transaction constructor methods
   */

  async makeMintTransactions({
    algoAmount,
  }: MakeMintTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    await this.init();

    const [suggestedParams, isUserOptedInToLST, state] = await Promise.all([
      this.algod.getTransactionParams().do(),
      isOptedIn(this.algod, this.from, this.lstId!),
      this.getState(),
    ]);

    const txns = [];

    // opt user into LST asset if needed
    if (!isUserOptedInToLST) {
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: this.from,
          to: this.from,
          assetIndex: Number(this.lstId!),
          amount: 0,
          suggestedParams,
        })
      );
    }

    // app call transaction
    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.mint({
      args: {},
      appReferences: [state.tinymanAppId],
      assetReferences: [this.asaId!, BigInt(this.lstId!)],
      accountReferences: [state.lpId!],
      staticFee: (2000).microAlgos(),
      sender: this.from,
    });

    txns.push(appCallTxn);

    // next must be algo payment
    txns.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.from,
        to: this.appAddr,
        amount: algoAmount,
        suggestedParams,
      })
    );

    const asaAmount = (BigInt(algoAmount) * state.rate) / BigInt(10000000000);

    if (state.rate > 0) {
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: this.from,
          to: this.appAddr,
          assetIndex: Number(this.asaId!),
          amount: asaAmount,
          suggestedParams,
        })
      );
    }

    return groupTxns(txns);
  }

  async makeRedeemTransactions({
    amount,
  }: MakeRedeemTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    await this.init();

    const [suggestedParams, isUserOptedInToASA, state] = await Promise.all([
      this.algod.getTransactionParams().do(),
      isOptedIn(this.algod, this.from, this.asaId!),
      this.getState(),
    ]);

    const txns = [];

    // opt user into LST asset if needed
    if (!isUserOptedInToASA) {
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: this.from,
          to: this.from,
          assetIndex: Number(this.asaId!),
          amount: 0,
          suggestedParams,
        })
      );
    }

    txns.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: this.from,
        to: this.appAddr,
        assetIndex: Number(this.lstId!),
        amount,
        suggestedParams,
      })
    );

    // app call transaction
    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.redeem({
      args: {},
      appReferences: [state.tinymanAppId],
      assetReferences: [this.asaId!, BigInt(this.lstId!)],
      accountReferences: [state.lpId],
      staticFee: (3000).microAlgos(),
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }

  async makeSwapTransactions({}: MakeSwapTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    await this.init();

    const state = await this.getState();

    // app call transaction
    const { transactions } = await this.client.createTransaction.swapOrFail({
      args: {},
      appReferences: [state.tinymanAppId],
      assetReferences: [state.asaId, state.lstId],
      accountReferences: [state.lpId],
    });

    return groupTxns(transactions);
  }

  async makeProtestTransactions({
    amount,
  }: MakeProtestTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    await this.init();

    const suggestedParams = await this.algod.getTransactionParams().do();

    const txns = [];

    const lpPayTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: this.from,
      to: algosdk.getApplicationAddress(this.appId),
      assetIndex: Number(this.lstId!),
      amount: amount,
      suggestedParams,
    });

    txns.push(lpPayTxn);

    const boxName = algosdk.decodeAddress(this.from).publicKey;

    // app call transaction
    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.protestStake({
      args: {},
      boxReferences: [{ appId: BigInt(0), name: boxName }],
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }

  async makeUndoProtestTransactions({}: MakeUndoProtestTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    await this.init();

    const [suggestedParams, isUserOptedInToLST, state] = await Promise.all([
      this.algod.getTransactionParams().do(),
      isOptedIn(this.algod, this.from, this.lstId!),
      this.getState(),
    ]);

    const txns = [];

    // opt user into LST asset if needed
    if (!isUserOptedInToLST) {
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: this.from,
          to: this.from,
          assetIndex: Number(this.lstId!),
          amount: 0,
          suggestedParams,
        })
      );
    }

    const boxName = algosdk.decodeAddress(this.from).publicKey;

    // app call transaction
    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.unprotestStake({
      args: {},
      assetReferences: [BigInt(this.lstId!)],
      boxReferences: [{ appId: BigInt(0), name: boxName }],
      staticFee: (2000).microAlgos(),
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }

  async makeAdminUndoProtestTransactions({
    user,
  }: MakeAdminUndoProtestTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    await this.init();

    const [isUserOptedInToLST, state] = await Promise.all([
      isOptedIn(this.algod, this.from, this.lstId!),
      this.getState(),
    ]);

    const boxName = algosdk.decodeAddress(user).publicKey;

    const accountReferences = [user];

    if (!isUserOptedInToLST) {
      try {
        const box = await this.algod
          .getApplicationBoxByName(Number(state.arc59AppId), boxName)
          .do();
        if (box) {
          accountReferences.push(algosdk.encodeAddress(box.value));
        }
      } catch (e) {}
    }

    const { transactions } =
      await this.client.createTransaction.adminUnprotestStake({
        args: { user },
        appReferences: [state.arc59AppId],
        assetReferences: [BigInt(this.lstId!)],
        accountReferences,
        boxReferences: [
          { appId: BigInt(0), name: boxName },
          { appId: state.arc59AppId, name: boxName },
        ],
        staticFee: (2000).microAlgos(),
      });

    return groupTxns(transactions);
  }

  async makeDissolveProtestTransactions({
    user,
  }: MakeDissolveProtestTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    await this.init();

    const [state, isUserOptedInToASA] = await Promise.all([
      this.getState(),
      isOptedIn(this.algod, user, this.asaId!),
    ]);

    const boxName = algosdk.decodeAddress(user).publicKey;

    const accountReferences = [user];

    if (!isUserOptedInToASA) {
      try {
        const box = await this.algod
          .getApplicationBoxByName(Number(state.arc59AppId), boxName)
          .do();
        if (box) {
          accountReferences.push(algosdk.encodeAddress(box.value));
        }
      } catch (e) {}
    }

    const { transactions } =
      await this.client.createTransaction.dissolveProtestingStake({
        args: { user },
        appReferences: [state.arc59AppId],
        accountReferences,
        assetReferences: [this.asaId!],
        boxReferences: [
          { appId: BigInt(0), name: boxName },
          { appId: state.arc59AppId, name: boxName },
        ],
        staticFee: isUserOptedInToASA
          ? (3000).microAlgos()
          : (1000).microAlgos(),
      });

    return groupTxns(transactions);
  }

  async makeKeyregOnlineTransactions({
    selectionKey,
    votingKey,
    spKey,
    firstRound,
    lastRound,
    keyDilution,
    fee,
  }: MakeKeyregOnlineTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    const { "incentive-eligible": ie } = await this.algod
      .accountInformation(this.appAddr)
      .do();

    const txns = [];

    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.keyregOnline({
      args: {
        selectionKey,
        votingKey,
        spKey,
        firstRound,
        lastRound,
        keyDilution,
        fee: ie ? 0 : 2_000_000,
      },
      staticFee: (ie ? 2000 : 1000).microAlgos(),
    });

    txns.push(appCallTxn);

    if (!ie) {
      const suggestedParams = await this.algod.getTransactionParams().do();

      const algoPayTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.from,
        to: this.appAddr,
        amount: 2_000_000,
        suggestedParams,
      });

      txns.push(algoPayTxn);
    }

    return groupTxns(txns);
  }

  async makeKeyregOfflineTransactions({}: MakeKeyregOfflineTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const { transactions } = await this.client.createTransaction.keyregOffline({
      args: {},
      staticFee: (2000).microAlgos(),
    });

    return groupTxns(transactions);
  }

  async makeWithdrawNoderunnerFeesTransactions({
    amount,
  }: MakeWithdrawNoderunnerFeesTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const state = await this.getState();

    const { transactions } =
      await this.client.createTransaction.withdrawNodeRunnerFees({
        args: {
          amount: amount !== undefined ? amount : state.noderunnerFees,
        },
        accountReferences: [state.noderunnerAddr],
        staticFee: (2000).microAlgos(),
      });

    return groupTxns(transactions);
  }

  async makeWithdrawPlatformFeesTransactions({
    amount,
  }: MakeWithdrawPlatformFeesTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    // app call transaction
    const { transactions } =
      await this.client.createTransaction.withdrawPlatformFees({
        args: {
          amount:
            amount !== undefined
              ? amount
              : (
                  await this.getState()
                ).platformFees,
        },
        staticFee: (2000).microAlgos(),
      });

    return groupTxns(transactions);
  }

  async makeChangeNoderunnerTransactions({
    noderunner,
  }: MakeChangeNoderunnerTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    // app call transaction
    const { transactions } =
      await this.client.createTransaction.changeNoderunner({
        args: {
          newNoderunner: noderunner,
        },
      });

    return groupTxns(transactions);
  }

  async makeChangeFeeAdminTransactions({
    feeAdmin,
  }: MakeChangeFeeAdminTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    // app call transaction
    const { transactions } = await this.client.createTransaction.changeFeeaddr({
      args: {
        newFeeaddr: feeAdmin,
      },
    });

    return groupTxns(transactions);
  }

  async makeChangeAdminTransactions({
    admin,
  }: MakeChangeAdminTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    const txns = [];

    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.changeAdmin_1({
      args: {
        newAdmin: admin,
      },
    });

    txns.push(appCallTxn);

    const {
      transactions: [appCallTxn2],
    } = await this.client.createTransaction.changeAdmin_2({
      args: {},
      sender: admin,
    });

    txns.push(appCallTxn2);

    return groupTxns(txns);
  }

  async makeUpdateMaxBalance({ newMaxBalance }: MakeUpdateMaxBalanceArgs) {
    const { transactions } =
      await this.client.createTransaction.updateMaxBalance({
        args: {
          newMaxBalance,
        },
      });

    return groupTxns(transactions);
  }

  async makeConfigureTransaction({
    env,
    asaId,
    lpType,
    lpId,
    platformFeeBps,
    noderunnerFeeBps,
    adminAddr,
    feeAdminAddr,
    noderunnerAddr,
    delayOptin,
    ...userNetworkConstants
  }: MakeConfigureTransactionArgs): Promise<algosdk.EncodedTransaction[]> {
    const txns = [];

    const suggestedParams = await this.algod.getTransactionParams().do();

    // MBR payment
    txns.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.from,
        to: this.appAddr,
        amount: delayOptin ? 202_000 : 303_000,
        suggestedParams,
      })
    );

    const networkConstants = {
      ...defaultNetworkConstants[env],
      ...userNetworkConstants,
    };

    const args = {
      asaId: asaId,
      delayOptin: delayOptin,
      lpType: strToUint(lpType),
      lpId: algosdk.decodeAddress(lpId).publicKey,
      platformFeeBps: platformFeeBps,
      noderunnerFeeBps: noderunnerFeeBps,
      adminAddr: adminAddr,
      feeAdminAddr: feeAdminAddr,
      noderunnerAddr: noderunnerAddr,
      ...networkConstants,
    };

    const {
      transactions: [appCallTxn],
    } = await this.client.createTransaction.configure({
      args,
      assetReferences: [asaId],
      appReferences: [args.tm2AppId, args.arc59AppId],
      accountReferences: [algosdk.encodeAddress(args.lpId)],
    });

    txns.push(appCallTxn);

    return groupTxns(txns);
  }

  async makeConfigure2Transaction({
    lstAsaName,
    lstUnitName,
    lstUrl,
  }: MakeConfigure2TransactionArgs): Promise<algosdk.EncodedTransaction[]> {
    const { transactions } = await this.client.createTransaction.configure2({
      args: {
        lstAsaName: strToUint(lstAsaName),
        lstUnitName: strToUint(lstUnitName),
        lstUrl: strToUint(lstUrl),
      },
    });

    return groupTxns(transactions);
  }

  async makeQueueUpdateFeesTransactions({
    newPlatformFeeBps,
    newNoderunnerFeeBps,
  }: MakeQueueUpdateFeesTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const { transactions } =
      await this.client.createTransaction.queueUpdateFees({
        args: {
          newNoderunnerFeeBps,
          newPlatformFeeBps,
        },
      });

    return groupTxns(transactions);
  }

  async makeResetUpdateFeesTransactions(): Promise<
    algosdk.EncodedTransaction[]
  > {
    const { transactions } =
      await this.client.createTransaction.resetUpdateFees({
        args: {},
      });

    return groupTxns(transactions);
  }

  async makeQueueUpgradeTransactions({
    hashes,
  }: MakeQueueUpgradeTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    hashes.forEach((hash, i) => {
      if (hash.length !== 32) {
        throw new Error(
          `Hash ${i} was expected to have length 32, but found ${hash.length} instead`
        );
      }
    });

    const { transactions } = await this.client.createTransaction.queueUpgrade({
      args: {
        hashes: Buffer.concat(hashes),
      },
    });

    return groupTxns(transactions);
  }

  async makeResetUpgradeTransactions(): Promise<algosdk.EncodedTransaction[]> {
    const { transactions } = await this.client.createTransaction.resetUpgrade({
      args: {},
    });

    return groupTxns(transactions);
  }

  async makeUpdateMaxBalanceTransactions({
    newMaxBalance,
  }: MakeUpdateMaxBalanceTransactionsArgs): Promise<
    algosdk.EncodedTransaction[]
  > {
    const { transactions } =
      await this.client.createTransaction.updateMaxBalance({
        args: {
          newMaxBalance,
        },
      });

    return groupTxns(transactions);
  }

  async makeUpgradeTransactions({
    approvalProgram,
    clearProgram,
  }: MakeUpgradeTransactionsArgs): Promise<algosdk.EncodedTransaction[]> {
    const txns = [];

    const suggestedParams = await this.algorand.getSuggestedParams();

    const upgradeTxn = algosdk.makeApplicationUpdateTxnFromObject({
      from: this.from,
      appIndex: Number(this.appId),
      approvalProgram,
      clearProgram,
      suggestedParams,
    });

    txns.push(upgradeTxn);

    return groupTxns(txns);
  }

  async makeDeleteTransactions(): Promise<algosdk.EncodedTransaction[]> {
    await this.init();

    const txns = [];

    const suggestedParams = await this.algod.getTransactionParams().do();

    const deleteTxn = algosdk.makeApplicationDeleteTxnFromObject({
      from: this.from,
      appIndex: Number(this.appId!),
      suggestedParams,
      foreignAssets: [Number(this.asaId!), Number(this.lstId!)],
    });

    txns.push(deleteTxn);

    return groupTxns(txns);
  }
}
