import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGameService } from '@/services/admin-game.service';
import { useToast } from '@/providers/useToast';
import type { CreateGameRoundInput, UpdateGameRoundInput } from '@/types';

const GUESS_IT_SLUG = 'guess_it';

export function useAdminGameRounds() {
  return useQuery({
    queryKey: ['admin-game-rounds', GUESS_IT_SLUG],
    queryFn: () => adminGameService.getRounds(GUESS_IT_SLUG),
  });
}

export function useAdminGameRound(roundId: string | null) {
  return useQuery({
    queryKey: ['admin-game-round', roundId],
    queryFn: () => adminGameService.getRound(roundId!),
    enabled: !!roundId,
  });
}

export function useCreateGameRound() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: CreateGameRoundInput) => adminGameService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-rounds'] });
      toast.success('دور ایجاد شد', 'دور بازی حدس بزن با موفقیت ایجاد شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد دور بازی';
      toast.error('خطا', msg);
    },
  });
}

export function useUpdateGameRound() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ roundId, input }: { roundId: string; input: UpdateGameRoundInput }) =>
      adminGameService.update(roundId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-game-round'] });
      toast.success('دور ویرایش شد', 'تغییرات با موفقیت ذخیره شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش دور بازی';
      toast.error('خطا', msg);
    },
  });
}

export function useSetGameRoundStatus() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ roundId, status }: { roundId: string; status: string }) =>
      adminGameService.setStatus(roundId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-game-round'] });
      const labels: Record<string, string> = {
        scheduled: 'برنامه‌ریزی شد',
        active: 'شروع شد',
        ended: 'پایان یافت',
        drawn: 'قرعه‌کشی شد',
        cancelled: 'لغو شد',
      };
      toast.success('وضعیت تغییر کرد', labels[variables.status] ?? 'وضعیت دور به‌روزرسانی شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در تغییر وضعیت دور';
      toast.error('خطا', msg);
    },
  });
}
