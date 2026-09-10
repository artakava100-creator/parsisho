import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSpecialService } from '@/services/admin-special.service';
import type {
  SpecialItem,
  CreateSpecialItemInput,
  UpdateSpecialItemInput,
} from '@/types';

const QUERY_KEY = ['admin', 'special-items'];
const PUBLIC_QUERY_KEY = ['public', 'special-items'];

export function useAdminSpecialItems() {
  return useQuery<SpecialItem[]>({
    queryKey: QUERY_KEY,
    queryFn: () => adminSpecialService.listItems(),
  });
}

export function useCreateSpecialItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpecialItemInput) => adminSpecialService.createItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}

export function useUpdateSpecialItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateSpecialItemInput }) =>
      adminSpecialService.updateItem(itemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}

export function useDeleteSpecialItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => adminSpecialService.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}

export function useReorderSpecialItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: { id: string; displayOrder: number }[]) =>
      adminSpecialService.reorderItems(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}

export function useToggleSpecialItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isEnabled }: { itemId: string; isEnabled: boolean }) =>
      adminSpecialService.toggleItem(itemId, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}

export function useDuplicateSpecialItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => adminSpecialService.duplicateItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}

export function usePublishedSpecialItems(limit: number, enabled: boolean) {
  return useQuery({
    queryKey: [...PUBLIC_QUERY_KEY, limit],
    queryFn: () => adminSpecialService.getPublishedItems(limit),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
