import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAttributeService } from '@/services/admin-attribute.service';
import type { CreateAttributeDefinitionInput, UpdateAttributeDefinitionInput } from '@/types';

const QUERY_KEY = ['admin', 'attribute-definitions'];
const VALUES_KEY = ['admin', 'attribute-values'];

export function useAdminAttributeDefinitions() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminAttributeService.listDefinitions(),
  });
}

export function useCreateAttributeDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAttributeDefinitionInput) => adminAttributeService.createDefinition(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateAttributeDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ definitionId, input }: { definitionId: string; input: UpdateAttributeDefinitionInput }) =>
      adminAttributeService.updateDefinition(definitionId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeactivateAttributeDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ definitionId, deactivate }: { definitionId: string; deactivate: boolean }) =>
      adminAttributeService.deactivateDefinition(definitionId, deactivate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteAttributeDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (definitionId: string) => adminAttributeService.deleteDefinition(definitionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderAttributeDefinitions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: { id: string; displayOrder: number }[]) =>
      adminAttributeService.reorderDefinitions(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useAdminAttributeValues(productId?: string, definitionId?: string) {
  return useQuery({
    queryKey: [...VALUES_KEY, { productId, definitionId }],
    queryFn: () => adminAttributeService.listAttributeValues(productId, definitionId),
  });
}

export function useSetAttributeValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, definitionId, value }: { productId: string; definitionId: string; value: unknown }) =>
      adminAttributeService.setAttributeValue(productId, definitionId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VALUES_KEY }),
  });
}
