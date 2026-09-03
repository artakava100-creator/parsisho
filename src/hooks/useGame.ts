import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameService } from '@/services/game.service';
import type { SubmitGuessResult } from '@/services/game.service';

export function useGuessItRounds() {
  return useQuery({
    queryKey: ['guess-it-rounds'],
    queryFn: () => gameService.getGuessItRounds(),
  });
}

export function useSubmitGuess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roundId,
      submittedAnswer,
      idempotencyKey,
    }: {
      roundId: string;
      submittedAnswer: string;
      idempotencyKey: string;
    }) => gameService.submitGuess(roundId, submittedAnswer, idempotencyKey),
    onSuccess: (result: SubmitGuessResult) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['guess-it-rounds'] });
    },
  });
}
