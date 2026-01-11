import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Household, Person } from '@/types';
import { householdApi } from '@/api/household';
import { personApi } from '@/api/person';

interface HouseholdState {
  households: Household[];
  currentHousehold: Household | null;
  people: Person[];
  isLoading: boolean;
  error: string | null;

  // Household actions
  fetchHouseholds: () => Promise<void>;
  fetchDefaultHousehold: () => Promise<void>;
  setCurrentHousehold: (household: Household | null) => void;
  createHousehold: (name: string) => Promise<Household>;
  updateHousehold: (id: string, name: string) => Promise<void>;
  deleteHousehold: (id: string) => Promise<void>;

  // Member actions
  inviteMember: (householdId: string, email: string, role?: string) => Promise<void>;
  removeMember: (householdId: string, memberId: string) => Promise<void>;

  // People actions
  fetchPeople: (householdId?: string) => Promise<void>;
  getPerson: (id: string) => Promise<Person>;
  createPerson: (data: Parameters<typeof personApi.create>[0]) => Promise<Person>;
  updatePerson: (id: string, data: Parameters<typeof personApi.update>[1]) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;

  // Relationship actions
  addRelationship: (personId: string, relatedPersonId: string, relationshipType: string) => Promise<void>;
  removeRelationship: (personId: string, relationshipId: string) => Promise<void>;

  clearError: () => void;
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set, get) => ({
      households: [],
      currentHousehold: null,
      people: [],
      isLoading: false,
      error: null,

      fetchHouseholds: async () => {
        set({ isLoading: true, error: null });
        try {
          const households = await householdApi.list();
          set({ households, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch households', isLoading: false });
          throw error;
        }
      },

      fetchDefaultHousehold: async () => {
        set({ isLoading: true, error: null });
        try {
          const household = await householdApi.getDefault();
          set({ currentHousehold: household, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch default household', isLoading: false });
          throw error;
        }
      },

      setCurrentHousehold: (household) => {
        set({ currentHousehold: household });
      },

      createHousehold: async (name) => {
        set({ isLoading: true, error: null });
        try {
          const household = await householdApi.create({ name });
          set((state) => ({
            households: [...state.households, household],
            isLoading: false,
          }));
          return household;
        } catch (error) {
          set({ error: 'Failed to create household', isLoading: false });
          throw error;
        }
      },

      updateHousehold: async (id, name) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await householdApi.update(id, { name });
          set((state) => ({
            households: state.households.map((h) => (h.id === id ? updated : h)),
            currentHousehold: state.currentHousehold?.id === id ? updated : state.currentHousehold,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update household', isLoading: false });
          throw error;
        }
      },

      deleteHousehold: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await householdApi.delete(id);
          set((state) => ({
            households: state.households.filter((h) => h.id !== id),
            currentHousehold: state.currentHousehold?.id === id ? null : state.currentHousehold,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to delete household', isLoading: false });
          throw error;
        }
      },

      inviteMember: async (householdId, email, role) => {
        set({ isLoading: true, error: null });
        try {
          await householdApi.inviteMember(householdId, {
            email,
            role: role as 'owner' | 'admin' | 'member' | 'viewer',
          });
          // Refresh household to get updated members
          const household = await householdApi.get(householdId);
          set((state) => ({
            households: state.households.map((h) => (h.id === householdId ? household : h)),
            currentHousehold: state.currentHousehold?.id === householdId ? household : state.currentHousehold,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to invite member', isLoading: false });
          throw error;
        }
      },

      removeMember: async (householdId, memberId) => {
        set({ isLoading: true, error: null });
        try {
          await householdApi.removeMember(householdId, memberId);
          // Refresh household to get updated members
          const household = await householdApi.get(householdId);
          set((state) => ({
            households: state.households.map((h) => (h.id === householdId ? household : h)),
            currentHousehold: state.currentHousehold?.id === householdId ? household : state.currentHousehold,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to remove member', isLoading: false });
          throw error;
        }
      },

      fetchPeople: async (householdId) => {
        set({ isLoading: true, error: null });
        try {
          const people = await personApi.list(householdId);
          set({ people, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch family members', isLoading: false });
          throw error;
        }
      },

      getPerson: async (id) => {
        const person = await personApi.get(id);
        return person;
      },

      createPerson: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const person = await personApi.create(data);
          set((state) => ({
            people: [...state.people, person],
            isLoading: false,
          }));
          return person;
        } catch (error) {
          set({ error: 'Failed to create family member', isLoading: false });
          throw error;
        }
      },

      updatePerson: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await personApi.update(id, data);
          set((state) => ({
            people: state.people.map((p) => (p.id === id ? updated : p)),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update family member', isLoading: false });
          throw error;
        }
      },

      deletePerson: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await personApi.delete(id);
          set((state) => ({
            people: state.people.filter((p) => p.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to delete family member', isLoading: false });
          throw error;
        }
      },

      addRelationship: async (personId, relatedPersonId, relationshipType) => {
        set({ isLoading: true, error: null });
        try {
          await personApi.addRelationship(personId, {
            related_person_id: relatedPersonId,
            relationship_type: relationshipType as Parameters<typeof personApi.addRelationship>[1]['relationship_type'],
          });
          // Refresh people to get updated relationships
          const { currentHousehold } = get();
          if (currentHousehold) {
            const people = await personApi.list(currentHousehold.id);
            set({ people, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({ error: 'Failed to add relationship', isLoading: false });
          throw error;
        }
      },

      removeRelationship: async (personId, relationshipId) => {
        set({ isLoading: true, error: null });
        try {
          await personApi.removeRelationship(personId, relationshipId);
          // Refresh people to get updated relationships
          const { currentHousehold } = get();
          if (currentHousehold) {
            const people = await personApi.list(currentHousehold.id);
            set({ people, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({ error: 'Failed to remove relationship', isLoading: false });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'household-storage',
      partialize: (state) => ({
        currentHousehold: state.currentHousehold,
      }),
    }
  )
);
