import _ from "lodash";
import { TonClient, TonClient4, Transaction } from "ton";
import * as TonVoteSDK from "ton-vote-contracts-sdk";
import {
  getClientV2,
  getClientV4,
  getProposalMetadata,
  getTransactions,
  ProposalMetadata,
  VotingPowerStrategy,
} from "ton-vote-contracts-sdk";
import { Dao, Proposal } from "types";
import { Logger, parseVotes } from "utils";
import { api } from "api";

const getProposalFromContract = async (
  clientV2: TonClient,
  clientV4: TonClient4,
  proposalAddress: string,
  _metadata?: ProposalMetadata,
  _transactions?: Transaction[]
): Promise<Proposal | null> => {
  const metadata =
    _metadata ||
    (await getProposalMetadata(clientV2, clientV4, proposalAddress));

  let transactions: Transaction[];
  let maxLt: undefined | string = "";

  if (!_transactions || _.isEmpty(_transactions)) {
    const result = await getTransactions(clientV2, proposalAddress);
    maxLt = result.maxLt;
    transactions = result.allTxns;
  } else {
    transactions = _transactions;
  }

  const { votingPowerStrategy } = metadata;

  const nftItemsHolders = await getAllNftHolders(
    proposalAddress,
    clientV4,
    metadata
  );

  const votingPower = await TonVoteSDK.getVotingPower(
    clientV4,
    metadata,
    transactions,
    {},
    votingPowerStrategy,
    nftItemsHolders
  );

  const proposalResult = TonVoteSDK.getCurrentResults(
    transactions,
    votingPower,
    metadata
  );
  const votes = TonVoteSDK.getAllVotes(transactions, metadata);

  return {
    votingPower,
    proposalResult: proposalResult as any,
    votes: parseVotes(votes, votingPower),
    metadata,
    maxLt,
  };
};

const getDaos = async (signal?: AbortSignal) => {
  try {
    Logger("Fetching daos from api");
    const apiResult = await api.getDaos(signal);

    if (!_.isArray(apiResult)) {
      return [];
    }
    return apiResult;
  } catch (error) {
    // get daos from contract
    // Logger("server error, Fetching daos from contract");
    // const client = await getClientV2();
    // const { daoAddresses, endDaoId } = await TonVoteSDK.getDaos(client, 10);
    // const daos: Dao[] = await Promise.all(
    //   daoAddresses.map(async (address): Promise<Dao> => {
    //     return {
    //       daoAddress: address,
    //       daoMetadata: await TonVoteSDK.getDaoMetadata(client, address),
    //       daoRoles: await TonVoteSDK.getDaoRoles(client, address),
    //       daoProposals:
    //         (await TonVoteSDK.getDaoProposals(client, address))
    //           .proposalAddresses || [],
    //     };
    //   })
    // );
    // return {
    //   daos,
    //   nextId: endDaoId,
    // };
  }
};

const getDao = async (
  daoAddress: string,
  signal?: AbortSignal
): Promise<Dao> => {
  // return Dao from api if exist
  try {
    Logger(`Fetching dao from api  ${daoAddress}`);
    const daoFromApi = await api.getDao(daoAddress, signal);
    if (_.isEmpty(daoFromApi)) {
      throw new Error("dao not found");
    }
    return daoFromApi;
  } catch (error) {
    // return Dao from contract
    Logger(
      `Dao not found in server \n Fetching dao from contract \n address: ${daoAddress}`
    );

    const client = await getClientV2();
    const daoFromContract: Dao = {
      daoAddress: daoAddress,
      daoRoles: await TonVoteSDK.getDaoRoles(client, daoAddress),
      daoMetadata: await TonVoteSDK.getDaoMetadata(client, daoAddress),
      daoProposals:
        (await TonVoteSDK.getDaoProposals(client, daoAddress))
          .proposalAddresses || [],
    };
    return daoFromContract;
  }
};

const getAllNftHolders = async (
  proposalAddress: string,
  clientV4: TonClient4,
  metadata: ProposalMetadata,
  signal?: AbortSignal
) => {
  if (metadata.votingPowerStrategy !== VotingPowerStrategy.NftCcollection) {
    return new Set<string>();
  }
  try {
    const res = await api.getAllNftHolders(proposalAddress, signal);
    if (!res) {
      throw new Error("nft holders not found");
    }
    return res;
  } catch (error) {
    return TonVoteSDK.getAllNftHolders(clientV4, metadata);
  }
};

export const lib = {
  getAllNftHolders,
  getProposalFromContract,
  getDaos,
  getDao,
};
