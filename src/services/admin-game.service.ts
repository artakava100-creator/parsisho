import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  GameRound,
  GameRoundStatus,
  CreateGameRoundInput,
  UpdateGameRoundInput,
  GameRoundRpcResult,
} from '@/types';

interface GameRoundRow {
  id: string;
  game_id: string;
  title: string;
  question: string;
  challenge_type: string;
  display_image_path: string | null;
  original_image_path: string | null;
  answer_type: string;
  correct_answer: string;
  accepted_answers: string[];
  entry_fee: number;
  prize_amount: number;
  winner_count: number;
  max_entries_per_user: number;
  starts_at: string;
  ends_at: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapGameRound(row: GameRoundRow): GameRound {
  return {
    id: row.id,
    gameId: row.game_id,
    title: row.title,
    question: row.question,
    challengeType: row.challenge_type,
    displayImagePath: row.display_image_path,
    originalImagePath: row.original_image_path,
    answerType: row.answer_type as GameRound['answerType'],
    correctAnswer: row.correct_answer,
    acceptedAnswers: row.accepted_answers ?? [],
    entryFee: row.entry_fee,
    prizeAmount: row.prize_amount,
    winnerCount: row.winner_count,
    maxEntriesPerUser: row.max_entries_per_user,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as GameRoundStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminGameService extends BaseService {
  async getRounds(gameSlug: string): Promise<GameRound[]> {
    const { data: gameData, error: gameError } = await this.client
      .from('games')
      .select('id')
      .eq('slug', gameSlug)
      .single();

    if (gameError) throw normalizeError(gameError);

    const { data, error } = await this.client
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameData.id)
      .order('created_at', { ascending: false });

    if (error) throw normalizeError(error);
    return (data as GameRoundRow[]).map(mapGameRound);
  }

  async getRound(roundId: string): Promise<GameRound> {
    const { data, error } = await this.client
      .from('game_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (error) throw normalizeError(error);
    return mapGameRound(data as GameRoundRow);
  }

  async create(input: CreateGameRoundInput): Promise<string> {
    const { data, error } = await this.client.rpc('create_game_round', {
      p_game_id: input.gameId,
      p_title: input.title,
      p_question: input.question,
      p_challenge_type: input.challengeType,
      p_answer_type: input.answerType,
      p_correct_answer: input.correctAnswer,
      p_display_image_path: input.displayImagePath ?? null,
      p_original_image_path: input.originalImagePath ?? null,
      p_accepted_answers: input.acceptedAnswers ?? [],
      p_entry_fee: input.entryFee ?? 0,
      p_prize_amount: input.prizeAmount ?? 0,
      p_winner_count: input.winnerCount ?? 1,
      p_max_entries_per_user: input.maxEntriesPerUser ?? 1,
      p_starts_at: input.startsAt ?? null,
      p_ends_at: input.endsAt ?? null,
    });

    if (error) throw normalizeError(error);
    const result = data as GameRoundRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
    return result.round_id!;
  }

  async update(roundId: string, input: UpdateGameRoundInput): Promise<void> {
    const { data, error } = await this.client.rpc('update_game_round', {
      p_round_id: roundId,
      p_title: input.title ?? null,
      p_question: input.question ?? null,
      p_challenge_type: input.challengeType ?? null,
      p_display_image_path: input.displayImagePath ?? null,
      p_original_image_path: input.originalImagePath ?? null,
      p_answer_type: input.answerType ?? null,
      p_correct_answer: input.correctAnswer ?? null,
      p_accepted_answers: input.acceptedAnswers ?? null,
      p_entry_fee: input.entryFee ?? null,
      p_prize_amount: input.prizeAmount ?? null,
      p_winner_count: input.winnerCount ?? null,
      p_max_entries_per_user: input.maxEntriesPerUser ?? null,
      p_starts_at: input.startsAt ?? null,
      p_ends_at: input.endsAt ?? null,
    });

    if (error) throw normalizeError(error);
    const result = data as GameRoundRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }

  async setStatus(roundId: string, newStatus: string): Promise<void> {
    const { data, error } = await this.client.rpc('set_game_round_status', {
      p_round_id: roundId,
      p_new_status: newStatus,
    });

    if (error) throw normalizeError(error);
    const result = data as GameRoundRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }

  async getGameId(slug: string): Promise<string> {
    const { data, error } = await this.client
      .from('games')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error) throw normalizeError(error);
    return (data as { id: string }).id;
  }
}

export const adminGameService = new AdminGameService();
