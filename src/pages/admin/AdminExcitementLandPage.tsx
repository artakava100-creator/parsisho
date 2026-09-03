import { useState } from 'react';
import { Gamepad2, Plus, Calendar, Clock, Users, Coins, Trophy, AlertCircle, Eye, Settings, Play, Pause, CheckCircle2, Pencil } from 'lucide-react';
import { useAdminGameRounds, useCreateGameRound, useUpdateGameRound, useSetGameRoundStatus } from '@/hooks/useAdminGame';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import { GameRoundForm, GameRoundDetail } from '@/components/admin/GameRoundForm';
import type { GameRound, GameRoundStatus, CreateGameRoundInput, UpdateGameRoundInput } from '@/types';

const GUESS_IT_SLUG = 'guess_it';

const STATUS_TONE: Record<GameRoundStatus, { tone: 'neutral' | 'primary' | 'error' | 'success' | 'warning'; label: string }> = {
  draft: { tone: 'neutral', label: 'پیش‌نویس' },
  scheduled: { tone: 'primary', label: 'برنامه‌ریزی‌شده' },
  active: { tone: 'error', label: 'فعال' },
  ended: { tone: 'success', label: 'پایان‌یافته' },
  cancelled: { tone: 'neutral', label: 'لغوشده' },
  drawn: { tone: 'warning', label: 'قرعه‌کشی‌شده' },
};

const CHALLENGE_LABELS: Record<string, string> = {
  image_count: 'شمارش تصویری',
  '3d_object': 'شیء سه‌بعدی',
  hidden_object: 'یافتن شیء پنهان',
  visual_identification: 'شناسایی بصری',
  text_question: 'سوال متنی',
};

export function AdminExcitementLandPage() {
  const { data: rounds, isLoading, error } = useAdminGameRounds();
  const [showCreate, setShowCreate] = useState(false);
  const [editRound, setEditRound] = useState<GameRound | null>(null);
  const [detailRound, setDetailRound] = useState<GameRound | null>(null);

  if (isLoading) return <FullPageSpinner />;
  if (error) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          title="خطا در بارگذاری"
          description="لطفاً دوباره تلاش کنید"
        />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">مدیریت سرزمین هیجان</h1>
            <p className="text-sm text-neutral-500">بازی حدس بزن - ایجاد و مدیریت دورها</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          دور جدید
        </Button>
      </div>

      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-50 border border-accent-500/20">
          <span className="text-sm font-medium text-accent-700">بازی: حدس بزن</span>
        </div>
      </div>

      {(!rounds || rounds.length === 0) ? (
        <Card className="p-8">
          <EmptyState
            icon={<Gamepad2 className="w-8 h-8" />}
            title="هنوز دور بازی ایجاد نشده"
            description="برای شروع، اولین دور حدس بزن را ایجاد کنید"
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                ایجاد دور جدید
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <RoundRow
              key={round.id}
              round={round}
              onEdit={() => setEditRound(round)}
              onDetail={() => setDetailRound(round)}
            />
          ))}
        </div>
      )}

      <CreateRoundModal open={showCreate} onClose={() => setShowCreate(false)} />
      <EditRoundModal round={editRound} onClose={() => setEditRound(null)} />
      <GameRoundDetail open={detailRound !== null} onClose={() => setDetailRound(null)} round={detailRound} />
    </div>
  );
}

function RoundRow({ round, onEdit, onDetail }: { round: GameRound; onEdit: () => void; onDetail: () => void }) {
  const setStatus = useSetGameRoundStatus();
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => void } | null>(null);

  const statusInfo = STATUS_TONE[round.status];
  const challengeLabel = CHALLENGE_LABELS[round.challengeType] ?? round.challengeType;

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction.action();
      setConfirmAction(null);
    }
  };

  const transition = (status: string, label: string) => {
    setConfirmAction({
      label,
      action: () => setStatus.mutate({ roundId: round.id, status }),
    });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-neutral-800 truncate">{round.title}</h3>
            <Badge tone={statusInfo.tone} variant="soft">{statusInfo.label}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              {challengeLabel}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatJalaliShort(new Date(round.startsAt))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(new Date(round.startsAt))} - {formatTime(new Date(round.endsAt))}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              ورود: {formatCurrency(round.entryFee)}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              جایزه: {formatCurrency(round.prizeAmount)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              برندگان: {toPersianDigits(round.winnerCount)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onDetail}>
            <Eye className="w-3.5 h-3.5" />
            جزئیات
          </Button>

          {round.status === 'draft' && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />
                ویرایش
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={setStatus.isPending}
                onClick={() => transition('scheduled', 'برنامه‌ریزی این دور')}
              >
                <Settings className="w-3.5 h-3.5" />
                برنامه‌ریزی
              </Button>
            </>
          )}

          {round.status === 'scheduled' && (
            <Button
              variant="primary"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => transition('active', 'شروع این دور')}
            >
              <Play className="w-3.5 h-3.5" />
              شروع
            </Button>
          )}

          {round.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => transition('ended', 'پایان دادن به این دور')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              پایان
            </Button>
          )}

          {round.status === 'ended' && (
            <Button
              variant="outline"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => transition('drawn', 'قرعه‌کشی این دور')}
            >
              <Trophy className="w-3.5 h-3.5" />
              قرعه‌کشی
            </Button>
          )}

          {(round.status === 'draft' || round.status === 'scheduled' || round.status === 'active') && (
            <Button
              variant="ghost"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => transition('cancelled', 'لغو این دور')}
            >
              <Pause className="w-3.5 h-3.5" />
              لغو
            </Button>
          )}
        </div>
      </div>

      <Modal open={confirmAction !== null} onClose={() => setConfirmAction(null)} size="sm">
        <div className="text-center py-2">
          <h3 className="text-lg font-bold text-neutral-800 mb-2">تأیید عملیات</h3>
          <p className="text-sm text-neutral-500 mb-1">آیا از</p>
          <p className="text-base font-bold text-primary-700 mb-1">{confirmAction?.label}</p>
          <p className="text-sm text-neutral-500 mb-6">مطمئن هستید؟</p>
          <div className="flex gap-3">
            <Button variant="primary" fullWidth onClick={handleConfirm}>بله، تأیید</Button>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function CreateRoundModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createRound = useCreateGameRound();
  const [gameId, setGameId] = useState<string>('');

  useState(() => {
    // gameId is resolved via the service when creating
  });

  const handleSubmit = async (input: CreateGameRoundInput | UpdateGameRoundInput) => {
    const createInput = input as CreateGameRoundInput;
    const resolvedGameId = createInput.gameId || gameId;
    if (!resolvedGameId) {
      const { adminGameService } = await import('@/services/admin-game.service');
      const id = await adminGameService.getGameId(GUESS_IT_SLUG);
      setGameId(id);
      createInput.gameId = id;
    } else {
      createInput.gameId = resolvedGameId;
    }
    await createRound.mutateAsync(createInput);
  };

  return (
    <GameRoundForm
      open={open}
      onClose={onClose}
      mode="create"
      gameId={gameId}
      onSubmit={handleSubmit}
      submitting={createRound.isPending}
    />
  );
}

function EditRoundModal({ round, onClose }: { round: GameRound | null; onClose: () => void }) {
  const updateRound = useUpdateGameRound();

  if (!round) return null;

  const handleSubmit = async (input: CreateGameRoundInput | UpdateGameRoundInput) => {
    await updateRound.mutateAsync({ roundId: round.id, input: input as UpdateGameRoundInput });
  };

  return (
    <GameRoundForm
      open={!!round}
      onClose={onClose}
      mode="edit"
      gameId={round.gameId}
      round={round}
      onSubmit={handleSubmit}
      submitting={updateRound.isPending}
    />
  );
}
