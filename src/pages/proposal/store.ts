import { Endpoints } from "types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProposalPersistedStore {
  serverUpdateTime?: number;
  setSrverUpdateTime: (value: number) => void;
  latestMaxLtAfterTx: { [key: string]: string | undefined };
  getLatestMaxLtAfterTx: (proposalAddress: string) => string | undefined;
  setLatestMaxLtAfterTx: (contractAddress: string, value?: string) => void;
}

export const useProposalPersistedStore = create(
  persist<ProposalPersistedStore>(
    (set, get) => ({
      latestMaxLtAfterTx: {},
      getLatestMaxLtAfterTx: (proposalAddress) =>
        get().latestMaxLtAfterTx
          ? get().latestMaxLtAfterTx[proposalAddress]
          : undefined,
      setLatestMaxLtAfterTx: (contractAddress, value) => {
        const prev = { ...get().latestMaxLtAfterTx, [contractAddress]: value };
        set({
          latestMaxLtAfterTx: prev,
        });
      },
      serverUpdateTime: undefined,
      setSrverUpdateTime: (serverUpdateTime) => set({ serverUpdateTime }),
    }),
    {
      name: "ton_vote_proposal_persisted_store", // name of the item in the storage (must be unique)
    }
  )
);

interface EndpointsStore {
  endpoints?: Endpoints;
  setEndpoints: (endpoints?: Endpoints) => void;
}

export const useEnpointsStore = create(
  persist<EndpointsStore>(
    (set) => ({
      endpoints: undefined,
      setEndpoints: (endpoints) => {
        set({ endpoints });
      },
    }),
    {
      name: "ton_vote_endpoints_verify_store",
    }
  )
);

export const useLatestMaxLtAfterTx = (address: string) => {
  const latestMaxLtAfterTx = useProposalPersistedStore(
    (store) => store.latestMaxLtAfterTx || {}
  );

  return latestMaxLtAfterTx[address];
};