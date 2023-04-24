import { useQueryClient, useQuery } from "@tanstack/react-query";
import { STATE_REFETCH_INTERVAL, QueryKeys } from "config";
import { useProposalAddress } from "hooks";
import _, { set } from "lodash";
import { Proposal, ProposalStatus } from "types";
import { getProposalStatus, Logger } from "utils";
import { api, getProposalFromContract } from "lib";
import { useProposalPersistedStore } from "./store";
import {
  getAllNftHolders,
  getClientV2,
  getClientV4,
  getSingleVoterPower,
  ProposalMetadata,
  VotingPowerStrategy,
} from "ton-vote-contracts-sdk";

export const useGetProposal = () => {
  const { getLatestMaxLtAfterTx } = useProposalPersistedStore();

  return async (
    proposalAddress: string,
    isCustomEndpoint: boolean,
    state?: Proposal,
    signal?: AbortSignal
  ): Promise<Proposal | null> => {
    const proposalPersistStore = useProposalPersistedStore.getState();
    const latestMaxLtAfterTx = getLatestMaxLtAfterTx(proposalAddress);

    const contractProposal = () => {
      Logger("getting state from contract");

      return getProposalFromContract(
        proposalAddress,
        state,
        latestMaxLtAfterTx
      );
    };

    const serverProposal = async (): Promise<Proposal | null> => {
      try {
        const state = await api.getProposal(proposalAddress, signal);

        if (_.isEmpty(state.metadata)) {
          throw new Error("Proposal not found is server");
        }
        Logger("getting state from server");
        return state;
      } catch (error) {
        return contractProposal();
      }
    };

    const getWithConditions = async () => {
      if (isCustomEndpoint) {
        return contractProposal();
      }

      // if (!(await api.validateServerLastUpdate(signal))) {
      //   Logger(`server is outdated, fetching from contract ${proposalAddress}`);
      //   return contractProposal();
      // }

      if (!latestMaxLtAfterTx) {
        return serverProposal();
      }

      const serverMaxLt = await api.getMaxLt(proposalAddress, signal);

      if (Number(serverMaxLt) < Number(latestMaxLtAfterTx)) {
        Logger(`server latestMaxLtAfterTx is outdated, fetching from contract`);
        return contractProposal();
      }
      proposalPersistStore.setLatestMaxLtAfterTx(proposalAddress, undefined);
      return serverProposal();
    };

    try {
      return await getWithConditions();
    } catch (error) {
      return contractProposal();
    }
  };
};

export const useProposalPageQuery = (isCustomEndpoint: boolean) => {
  const proposalAddress = useProposalAddress();
  const getProposal = useGetProposal();
  const queryKey = [QueryKeys.PROPOSAL_PAGE, proposalAddress];
  const queryClient = useQueryClient();
  const { getLatestMaxLtAfterTx } = useProposalPersistedStore();

  return useQuery(
    queryKey,
    async ({ signal }) => {
      const state = queryClient.getQueryData<Proposal>(queryKey);

      // when we have state already and vote finished, we return the cached state

      const voteStatus = state?.metadata && getProposalStatus(state?.metadata);
      const closed = voteStatus === ProposalStatus.CLOSED;

      // vote finished, we no longer need to refetch to get new data
      if (closed) return state;

      return getProposal(proposalAddress, isCustomEndpoint, state, signal);
    },
    {
      refetchInterval: STATE_REFETCH_INTERVAL,
      staleTime: 30_000,
      enabled: !!proposalAddress,
      initialData: () => {
        const latestMaxLtAfterTx = getLatestMaxLtAfterTx(proposalAddress);

        if (!latestMaxLtAfterTx) {
          return queryClient.getQueryData<Proposal>([
            QueryKeys.PROPOSAL,
            proposalAddress,
          ]);
        }
      },
    }
  );
};

export const useWalletVotingPower = (account?: string, proposal?: Proposal | null) => {
  return useQuery(
    [QueryKeys.SIGNLE_VOTING_POWER, account],
    async () => {
      const clientV4 = await getClientV4();
      let allNftHolders = new Set<string>();
      if (
        proposal?.metadata?.votingPowerStrategy ===
        VotingPowerStrategy.NftCcollection
      ) {
        allNftHolders = await getAllNftHolders(clientV4, proposal?.metadata!);
      }

    Logger(`Fetching voting power for account: ${account}`);

      return getSingleVoterPower(
        clientV4,
        account!,
        proposal?.metadata!,
        proposal?.metadata?.votingPowerStrategy!,
        allNftHolders
      );
    },
    {
      enabled: !!account && !!proposal,
    }
  );
};
