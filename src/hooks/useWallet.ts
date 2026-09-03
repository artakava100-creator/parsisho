import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';
import type { Wallet } from '@/types';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.getWallet(),
  });
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions(),
  });
}

export function useParsiPackages() {
  return useQuery({
    queryKey: ['parsi-packages'],
    queryFn: () => walletService.getPackages(),
  });
}

export function usePaymentOrders() {
  return useQuery({
    queryKey: ['payment-orders'],
    queryFn: () => walletService.getPaymentOrders(),
  });
}

export function usePurchasePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packageId: string) => walletService.purchasePackage(packageId),
    onSuccess: (wallet: Wallet) => {
      queryClient.setQueryData(['wallet'], wallet);
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}

export function useCreatePaymentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packageId, idempotencyKey }: { packageId: string; idempotencyKey: string }) =>
      walletService.createPaymentOrder(packageId, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentOrderId: string) => walletService.confirmPayment(paymentOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
    },
  });
}

export function useCancelPaymentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentOrderId: string) => walletService.cancelPaymentOrder(paymentOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
    },
  });
}
