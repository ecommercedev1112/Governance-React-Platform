import {
  QueryKey,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DAOS_LIMIT,
  PROPOSALS_LIMIT,
  QueryKeys,
  STATE_REFETCH_INTERVAL,
  TON_CONNECTOR,
} from "config";
import { getContractState, server } from "lib";
import { useIsCustomEndpoint } from "hooks";
import { useAppPersistedStore, useEnpointModal } from "store";
import { DaoRoles, ProposalState, ProposalStatus } from "types";
import { getProposalStatus, Logger } from "utils";
import * as TonVoteSDK from "ton-vote-sdk";
import { Address } from "ton-core";
import _ from "lodash";

export const useDaoMetadataQuery = (daoAddress: string, enabled?: boolean) => {
  const isCustomEndpoint = useIsCustomEndpoint();
  const queryKey = useGetQueryKey([QueryKeys.DAO_METADATA, daoAddress]);
  const clientV2 = useClientsQuery()?.clientV2;
  return useQuery(
    queryKey,
    () => {
      if (isCustomEndpoint) {
        return TonVoteSDK.getDaoMetadata(clientV2!, Address.parse(daoAddress));
      }
      return server.getDaoMetadata(daoAddress);
    },
    {
      staleTime: Infinity,
      enabled: !!clientV2 && !!daoAddress && !!enabled,
    }
  );
};

export const useDaosQuery = () => {
  const isCustomEndpoint = useIsCustomEndpoint();
  const queryKey = useGetQueryKey([QueryKeys.DAOS]);
  const clientV2 = useClientsQuery()?.clientV2;

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      if (isCustomEndpoint) {
        const nextPage = pageParam ? Number(pageParam) : undefined;
        return TonVoteSDK.getDaos(clientV2!, nextPage, DAOS_LIMIT);
      }
      return server.getDaos();
    },
    staleTime: Infinity,
    getNextPageParam: (lastPage) => lastPage.endDaoId,
    enabled: !!clientV2,
  });
};

export const useAddDao = () => {
  const queryClient = useQueryClient();
  const queryKey = useGetQueryKey([QueryKeys.DAOS]);

  return (daoAddress: string) => {
    const daos = queryClient.getQueryData(queryKey) as any;

    if (!daos) return;

    daos.pages[0].daoAddresses.unshift(daoAddress);
    queryClient.setQueryData(queryKey, daos);
  };
};

export const useDaoRolesQuery = (daoAddress: string) => {
  const isCustomEndpoint = useIsCustomEndpoint();
  const queryKey = useGetQueryKey([QueryKeys.DAO_ROLES, daoAddress]);
  const clientV2 = useClientsQuery()?.clientV2;

  return useQuery(
    queryKey,
    async () => {
      let roles = {} as DaoRoles;
      if (isCustomEndpoint) {
        roles = await TonVoteSDK.getDaoRoles(
          clientV2!,
          Address.parse(daoAddress)
        );
      } else {
        roles = await server.getDaoRoles(daoAddress);
      }

      return {
        owner: roles.owner.toString(),
        proposalOwner: roles.proposalOwner.toString(),
      };
    },
    {
      staleTime: Infinity,
      enabled: !!clientV2 && !!daoAddress,
    }
  );
};

export const useDaoProposalsQuery = (daoAddress: string) => {
  const isCustomEndpoint = useIsCustomEndpoint();

  const queryKey = useGetQueryKey([QueryKeys.PROPOSALS, daoAddress]);
  const clientV2 = useClientsQuery()?.clientV2;

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const nextPage = pageParam ? Number(pageParam) : undefined;
      if (isCustomEndpoint) {
        return TonVoteSDK.getDaoProposals(
          clientV2!,
          Address.parse(daoAddress),
          nextPage,
          PROPOSALS_LIMIT
        );
      }
      return server.getDaoProposals(daoAddress);
    },
    enabled: !!clientV2 && !!daoAddress,
    getNextPageParam: (lastPage) => lastPage.endProposalId,
  });
};

export const useProposalInfoQuery = (proposalAddress: string) => {
  const isCustomEndpoint = useIsCustomEndpoint();
  const queryKey = useGetQueryKey([QueryKeys.PROPOSAL_INFO, proposalAddress]);
  const clients = useClientsQuery();

  return useQuery(
    queryKey,
    () => {
      if (isCustomEndpoint) {
        return TonVoteSDK.getProposalInfo(
          clients!.clientV2,
          clients!.clientV4,
          Address.parse(proposalAddress)
        );
      }
      return server.getDaoProposalInfo(proposalAddress);
    },
    {
      staleTime: Infinity,
      enabled: !!clients?.clientV2 && !!clients.clientV4 && !!proposalAddress,
    }
  );
};

export const useProposalStatusQuery = (
  proposalAddress: string,
  refetchInterval?: number
) => {
  const { data: proposalInfo } = useProposalInfoQuery(proposalAddress);
  const queryKey = useGetQueryKey([
    QueryKeys.PROPOSAL_TIMELINE,
    proposalAddress,
  ]);

  const query = useQuery(
    queryKey,
    async () => {
      if (!proposalInfo) return null;
      return getProposalStatus(proposalInfo);
    },
    {
      enabled: !!proposalInfo,
      refetchInterval: refetchInterval,
    }
  );

  return query.data as ProposalStatus | null;
};

export const useProposalStateQuery = (
  proposalAddress: string,
  refetchInterval: number = STATE_REFETCH_INTERVAL
) => {
  console.log(Address.isAddress(proposalAddress));

  const endpointModal = useEnpointModal();
  const isCustomEndpoint = useIsCustomEndpoint();
  const proposalStatus = useProposalStatusQuery(proposalAddress);
  const queryKey = useGetQueryKey([QueryKeys.STATE, proposalAddress]);
  const queryClient = useQueryClient();
  const voteFinished = proposalStatus === ProposalStatus.CLOSED;
  const { getLatestMaxLtAfterTx, setLatestMaxLtAfterTx, latestMaxLtAfterTx } =
    useAppPersistedStore();

  const clients = useClientsQuery();

  const { refetch: fetchProposalInfo } = useProposalInfoQuery(proposalAddress);

  return useQuery(
    queryKey,
    async () => {
      const { data: proposalInfo } = await fetchProposalInfo();

      if (!proposalInfo) throw new Error("Missing proposal info");

      const state = queryClient.getQueryData(queryKey) as ProposalState | null;

      const _getContractState = () => {
        return getContractState(
          clients?.clientV2!,
          clients?.clientV4!,
          proposalAddress,
          proposalInfo,
          state,
          getLatestMaxLtAfterTx(proposalAddress)
        );
      };

      if (isCustomEndpoint) {
        Logger("custom endpoint, fetching from contract");
        return _getContractState() || null;
      }
      const serverState = await server.getState(
        proposalAddress,
        getLatestMaxLtAfterTx(proposalAddress)
      );
      if (serverState) {
        setLatestMaxLtAfterTx(proposalAddress, undefined);
      }
      return serverState || _getContractState() || null;
    },
    {
      onError: () => endpointModal.setError(true),
      refetchInterval: !voteFinished ? refetchInterval : undefined,
      staleTime: voteFinished ? Infinity : 2_000,
      enabled: !!clients?.clientV2 && !!clients?.clientV4 && !!proposalAddress,
    }
  );
};

export const useServerLastFetchUpdateValidationQuery = () => {
  const endpointModal = useEnpointModal();
  return useQuery(
    [QueryKeys.SERVER_VALIDATION],
    () => server.validateServerLastUpdate(),
    {
      refetchInterval: 20_000,
      // TODO, maybe set custom endpoint
      onError: () => endpointModal.setError(true),
      onSuccess: (isValid) => {
        if (!isValid) endpointModal.setError(true);
      },
    }
  );
};

const useGetQueryKey = (key: string[]): QueryKey => {
  const { clientV2Endpoint, clientV4Endpoint, apiKey } = useAppPersistedStore();
  return [...key, clientV2Endpoint, clientV4Endpoint, apiKey];
};

export const useClientsQuery = () => {
  const key = useGetQueryKey(["useGetQueryKey"]);
  const { clientV2Endpoint, clientV4Endpoint, apiKey } = useAppPersistedStore();
  const query = useQuery(key, async () => {
    return {
      clientV2: await TonVoteSDK.getClientV2(clientV2Endpoint, apiKey),
      clientV4: await TonVoteSDK.getClientV4(clientV4Endpoint || ""),
    };
  });

  return query.data;
};
