import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define the shape of your state
interface CompareState {
  ids: string[];
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      ids: [], // Initial state: empty array

      // Action: Add item (with limit check)
      addItem: (id) =>
        set((state) => {
          if (state.ids.includes(id)) return state; // Don't add duplicates
          if (state.ids.length >= 4) return state; // Limit to 4 items
          return { ids: [...state.ids, id] };
        }),

      // Action: Remove item
      removeItem: (id) =>
        set((state) => ({
          ids: state.ids.filter((i) => i !== id),
        })),

      // Action: Clear all
      clear: () => set({ ids: [] }),
    }),
    {
      name: "compare-storage", // Unique name for localStorage key
    },
  ),
);
