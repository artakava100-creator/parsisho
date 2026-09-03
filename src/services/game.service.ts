import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { GameAnswerType, GameRoundStatus, ApiError } from '@/types';

export interface PublicGameRound {
  id: string;
  gameId: string;
  title: string;
  question: string;
  challengeType: string;
  displayImagePath: string | null;
  answerType: GameAnswerType;
  entryFee: number;
  prizeAmount: number;
  winnerCount: number;
  maxEntriesPerUser: number;
  startsAt: string;
  endsAt: string;
  status: GameRoundStatus;
  createdAt: string;
}

interface PublicGameRoundRow {
  id: string;
  game_id: string;
  title: string;
  question: string;
  challenge_type: string;
  display_image_path: string | null;
  answer_type: string;
  entry_fee: number;
  prize_amount: number;
  winner_count: number;
  max_entries_per_user: number;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
}

function mapPublicRound(row: PublicGameRoundRow): PublicGameRound {
  return {
    id: row.id,
    gameId: row.game_id,
    title: row.title,
    question: row.question,
    challengeType: row.challenge_type,
    displayImagePath: row.display_image_path,
    answerType: row.answer_type as GameAnswerType,
    entryFee: row.entry_fee,
    prizeAmount: row.prize_amount,
    winnerCount: row.winner_count,
    maxEntriesPerUser: row.max_entries_per_user,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as GameRoundStatus,
    createdAt: row.created_at,
  };
}

export interface SubmitGuessResult {
  success: boolean;
  error?: string;
  entryId?: string;
  resultId?: string;
  isCorrect?: boolean;
  qualificationStatus?: string;
  resultType?: string;
  message?: string;
  newBalance?: number;
  idempotentReplay?: boolean;
}

export class GameService extends BaseService {
  async getGuessItRounds(): Promise<PublicGameRound[]> {
    const { data, error } = await this.client.rpc('get_public_game_rounds');

    if (error) throw normalizeError(error);

    const rows = (data as PublicGameRoundRow[]) || [];
    const guessItGameId = await this.getGuessItGameId();
    return rows
      .filter((r) => r.game_id === guessItGameId)
      .map(mapPublicRound);
  }

  async getRound(roundId: string): Promise<PublicGameRound | null> {
    const rounds = await this.getGuessItRounds();
    return rounds.find((r) => r.id === roundId) ?? null;
  }

  async submitGuess(
    roundId: string,
    submittedAnswer: string,
    idempotencyKey: string,
  ): Promise<SubmitGuessResult> {
    const { data, error } = await this.client.rpc('submit_guess_attempt', {
      p_round_id: roundId,
      p_submitted_answer: submittedAnswer,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در ثبت پاسخ' } as ApiError;
    }

    return {
      success: true,
      entryId: result.entry_id as string,
      resultId: result.result_id as string,
      isCorrect: result.is_correct as boolean,
      qualificationStatus: result.qualification_status as string,
      resultType: result.result_type as string,
      message: result.message as string,
      newBalance: result.new_balance as number | undefined,
      idempotentReplay: result.idempotent_replay as boolean | undefined,
    };
  }

  private async getGuessItGameId(): Promise<string> {
    const { data, error } = await this.client
      .from('games')
      .select('id')
      .eq('slug', 'guess_it')
      .single();

    if (error) throw normalizeError(error);
    return (data as { id: string }).id;
  }
}

export const gameService = new GameService();
