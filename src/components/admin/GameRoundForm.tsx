import { useState } from 'react';
import { Calendar, Clock, Users, Coins, Trophy, AlertCircle, Image as ImageIcon, Lock, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import type { GameRound, GameRoundStatus, GameAnswerType, CreateGameRoundInput, UpdateGameRoundInput } from '@/types';

const CHALLENGE_TYPES: { value: string; label: string }[] = [
  { value: 'image_count', label: 'شمارش تصویری' },
  { value: '3d_object', label: 'شیء سه‌بعدی' },
  { value: 'hidden_object', label: 'یافتن شیء پنهان' },
  { value: 'visual_identification', label: 'شناسایی بصری' },
  { value: 'text_question', label: 'سوال متنی' },
];

const STATUS_TONE: Record<GameRoundStatus, { tone: 'neutral' | 'primary' | 'error' | 'success' | 'warning'; label: string }> = {
  draft: { tone: 'neutral', label: 'پیش‌نویس' },
  scheduled: { tone: 'primary', label: 'برنامه‌ریزی‌شده' },
  active: { tone: 'error', label: 'فعال' },
  ended: { tone: 'success', label: 'پایان‌یافته' },
  cancelled: { tone: 'neutral', label: 'لغوشده' },
  drawn: { tone: 'warning', label: 'قرعه‌کشی‌شده' },
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

interface FormState {
  title: string;
  question: string;
  challengeType: string;
  answerType: GameAnswerType;
  correctAnswer: string;
  acceptedAnswers: string;
  displayImagePath: string;
  originalImagePath: string;
  entryFee: string;
  prizeAmount: string;
  winnerCount: string;
  maxEntriesPerUser: string;
  startsAt: string;
  endsAt: string;
}

function emptyForm(): FormState {
  return {
    title: '',
    question: '',
    challengeType: 'image_count',
    answerType: 'text',
    correctAnswer: '',
    acceptedAnswers: '',
    displayImagePath: '',
    originalImagePath: '',
    entryFee: '0',
    prizeAmount: '0',
    winnerCount: '1',
    maxEntriesPerUser: '1',
    startsAt: '',
    endsAt: '',
  };
}

function roundToForm(round: GameRound): FormState {
  return {
    title: round.title,
    question: round.question,
    challengeType: round.challengeType,
    answerType: round.answerType,
    correctAnswer: round.correctAnswer,
    acceptedAnswers: round.acceptedAnswers.join('، '),
    displayImagePath: round.displayImagePath ?? '',
    originalImagePath: round.originalImagePath ?? '',
    entryFee: String(round.entryFee),
    prizeAmount: String(round.prizeAmount),
    winnerCount: String(round.winnerCount),
    maxEntriesPerUser: String(round.maxEntriesPerUser),
    startsAt: toDatetimeLocalValue(round.startsAt),
    endsAt: toDatetimeLocalValue(round.endsAt),
  };
}

function buildCreateInput(state: FormState, gameId: string): CreateGameRoundInput {
  const accepted = state.acceptedAnswers
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    gameId,
    title: state.title.trim(),
    question: state.question.trim(),
    challengeType: state.challengeType,
    answerType: state.answerType,
    correctAnswer: state.correctAnswer.trim(),
    displayImagePath: state.displayImagePath.trim() || null,
    originalImagePath: state.originalImagePath.trim() || null,
    acceptedAnswers: accepted,
    entryFee: parseInt(state.entryFee, 10) || 0,
    prizeAmount: parseInt(state.prizeAmount, 10) || 0,
    winnerCount: parseInt(state.winnerCount, 10) || 1,
    maxEntriesPerUser: parseInt(state.maxEntriesPerUser, 10) || 1,
    startsAt: state.startsAt ? new Date(state.startsAt).toISOString() : null,
    endsAt: state.endsAt ? new Date(state.endsAt).toISOString() : null,
  };
}

function buildUpdateInput(state: FormState): UpdateGameRoundInput {
  const accepted = state.acceptedAnswers
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title: state.title.trim(),
    question: state.question.trim(),
    challengeType: state.challengeType,
    answerType: state.answerType,
    correctAnswer: state.correctAnswer.trim(),
    displayImagePath: state.displayImagePath.trim() || null,
    originalImagePath: state.originalImagePath.trim() || null,
    acceptedAnswers: accepted,
    entryFee: parseInt(state.entryFee, 10) || 0,
    prizeAmount: parseInt(state.prizeAmount, 10) || 0,
    winnerCount: parseInt(state.winnerCount, 10) || 1,
    maxEntriesPerUser: parseInt(state.maxEntriesPerUser, 10) || 1,
    startsAt: state.startsAt ? new Date(state.startsAt).toISOString() : null,
    endsAt: state.endsAt ? new Date(state.endsAt).toISOString() : null,
  };
}

function validateForm(state: FormState): string | null {
  if (!state.title.trim()) return 'عنوان دور الزامی است';
  if (!state.question.trim()) return 'سوال دور الزامی است';
  if (!state.correctAnswer.trim()) return 'پاسخ صحیح الزامی است';
  if (!state.startsAt || !state.endsAt) return 'زمان شروع و پایان الزامی است';
  if (new Date(state.endsAt) <= new Date(state.startsAt)) return 'زمان پایان باید بعد از زمان شروع باشد';
  if (parseInt(state.winnerCount, 10) <= 0) return 'تعداد برندگان باید بیشتر از صفر باشد';
  if (parseInt(state.maxEntriesPerUser, 10) <= 0) return 'حداکثر شرکت در هر کاربر باید بیشتر از صفر باشد';
  return null;
}

interface GameRoundFormProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  gameId: string;
  round?: GameRound | null;
  onSubmit: (input: CreateGameRoundInput | UpdateGameRoundInput) => Promise<void>;
  submitting: boolean;
}

export function GameRoundForm({ open, onClose, mode, gameId, round, onSubmit, submitting }: GameRoundFormProps) {
  const [state, setState] = useState<FormState>(() =>
    mode === 'edit' && round ? roundToForm(round) : emptyForm(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const error = validateForm(state);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      if (mode === 'create') {
        await onSubmit(buildCreateInput(state, gameId));
      } else {
        await onSubmit(buildUpdateInput(state));
      }
      setState(emptyForm());
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره دور';
      setFormError(msg);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'ویرایش دور حدس بزن' : 'ایجاد دور جدید حدس بزن'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="عنوان دور"
          value={state.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="مثلاً: چند سیب در تصویر وجود دارد؟"
        />

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1.5">سوال</label>
          <textarea
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-100/60 border border-neutral-300 text-neutral-800 placeholder:text-neutral-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
            rows={2}
            value={state.question}
            onChange={(e) => update('question', e.target.value)}
            placeholder="سوال دور بازی..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-2">نوع چالش</label>
            <select
              className="w-full h-11 px-4 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              value={state.challengeType}
              onChange={(e) => update('challengeType', e.target.value)}
            >
              {CHALLENGE_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-2">نوع پاسخ</label>
            <select
              className="w-full h-11 px-4 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              value={state.answerType}
              onChange={(e) => update('answerType', e.target.value as GameAnswerType)}
            >
              <option value="text">متن</option>
              <option value="number">عدد</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="تصویر نمایشی برای کاربران"
            value={state.displayImagePath}
            onChange={(e) => update('displayImagePath', e.target.value)}
            placeholder="مسیر تصویر نمایشی..."
            dir="ltr"
            hint="این تصویر برای کاربران نمایش داده می‌شود"
          />
          <Input
            label="تصویر اصلی خصوصی"
            value={state.originalImagePath}
            onChange={(e) => update('originalImagePath', e.target.value)}
            placeholder="مسیر تصویر اصلی..."
            dir="ltr"
            hint="فقط مدیران قابل مشاهده است - حاوی پاسخ"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
          <Info className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-500 leading-relaxed">
            تصویر نمایشی برای کاربران قابل مشاهده است، اما تصویر اصلی خصوصی فقط در پنل مدیریت نمایش داده می‌شود و حاوی پاسخ صحیح است.
          </p>
        </div>

        <Input
          label="پاسخ صحیح"
          value={state.correctAnswer}
          onChange={(e) => update('correctAnswer', e.target.value)}
          placeholder="پاسخ صحیح..."
          hint="این پاسخ فقط در پنل مدیریت قابل مشاهده است"
        />

        <Input
          label="پاسخ‌های قابل قبول (با ویرگول جدا کنید)"
          value={state.acceptedAnswers}
          onChange={(e) => update('acceptedAnswers', e.target.value)}
          placeholder="پاسخ ۱، پاسخ ۲، ..."
          hint="پاسخ‌های جایگزین که صحیح محسوب می‌شوند"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="هزینه ورود (پارسی)"
            type="number"
            inputMode="numeric"
            value={state.entryFee}
            onChange={(e) => update('entryFee', e.target.value)}
            dir="ltr"
            placeholder="0"
          />
          <Input
            label="مبلغ جایزه (پارسی)"
            type="number"
            inputMode="numeric"
            value={state.prizeAmount}
            onChange={(e) => update('prizeAmount', e.target.value)}
            dir="ltr"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="تعداد برندگان"
            type="number"
            inputMode="numeric"
            value={state.winnerCount}
            onChange={(e) => update('winnerCount', e.target.value)}
            dir="ltr"
            placeholder="1"
          />
          <Input
            label="حداکثر شرکت در هر کاربر"
            type="number"
            inputMode="numeric"
            value={state.maxEntriesPerUser}
            onChange={(e) => update('maxEntriesPerUser', e.target.value)}
            dir="ltr"
            placeholder="1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="زمان شروع"
            type="datetime-local"
            value={state.startsAt}
            onChange={(e) => update('startsAt', e.target.value)}
            dir="ltr"
          />
          <Input
            label="زمان پایان"
            type="datetime-local"
            value={state.endsAt}
            onChange={(e) => update('endsAt', e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-11 inline-flex items-center justify-center rounded-lg bg-primary-700 hover:bg-primary-600 text-white font-semibold transition-all duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {submitting && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ml-2" />}
            {isEdit ? 'ذخیره تغییرات' : 'ایجاد دور'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 inline-flex items-center justify-center rounded-lg bg-transparent hover:bg-surface-overlay text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface GameRoundDetailProps {
  open: boolean;
  onClose: () => void;
  round: GameRound | null;
}

export function GameRoundDetail({ open, onClose, round }: GameRoundDetailProps) {
  if (!round) return null;

  const statusInfo = STATUS_TONE[round.status];
  const challengeLabel = CHALLENGE_TYPES.find((ct) => ct.value === round.challengeType)?.label ?? round.challengeType;

  return (
    <Modal open={open} onClose={onClose} title="جزئیات دور" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-neutral-800">{round.title}</h3>
          <Badge tone={statusInfo.tone} variant="soft">{statusInfo.label}</Badge>
        </div>

        <div className="space-y-3 text-sm">
          <DetailRow label="سوال" value={round.question} />
          <DetailRow label="نوع چالش" value={challengeLabel} />
          <DetailRow label="نوع پاسخ" value={round.answerType === 'text' ? 'متن' : 'عدد'} />

          {round.displayImagePath && (
            <div className="flex items-start gap-2">
              <ImageIcon className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-neutral-500 text-xs">تصویر نمایشی</p>
                <p className="text-neutral-600 font-mono text-xs" dir="ltr">{round.displayImagePath}</p>
              </div>
            </div>
          )}

          {round.originalImagePath && (
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-neutral-500 text-xs">تصویر اصلی خصوصی</p>
                <p className="text-neutral-600 font-mono text-xs" dir="ltr">{round.originalImagePath}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-neutral-500 text-xs">پاسخ صحیح (خصوصی)</p>
              <p className="text-error-700 font-mono text-xs">{round.correctAnswer}</p>
            </div>
          </div>

          {round.acceptedAnswers.length > 0 && (
            <div>
              <p className="text-neutral-500 text-xs mb-1">پاسخ‌های قابل قبول</p>
              <div className="flex flex-wrap gap-1.5">
                {round.acceptedAnswers.map((ans, i) => (
                  <Badge key={i} tone="neutral" variant="soft">{ans}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
            <DetailRow icon={<Coins className="w-3.5 h-3.5" />} label="هزینه ورود" value={formatCurrency(round.entryFee)} />
            <DetailRow icon={<Trophy className="w-3.5 h-3.5" />} label="مبلغ جایزه" value={formatCurrency(round.prizeAmount)} />
            <DetailRow icon={<Users className="w-3.5 h-3.5" />} label="تعداد برندگان" value={toPersianDigits(round.winnerCount)} />
            <DetailRow icon={<Users className="w-3.5 h-3.5" />} label="حداکثر شرکت" value={toPersianDigits(round.maxEntriesPerUser)} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="شروع" value={`${formatJalaliShort(new Date(round.startsAt))} - ${formatTime(new Date(round.startsAt))}`} />
            <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="پایان" value={`${formatJalaliShort(new Date(round.endsAt))} - ${formatTime(new Date(round.endsAt))}`} />
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200">
          <p className="text-xs text-neutral-500 text-center">بخش شرکت‌کنندگان و نتایج: در مرحله بعد</p>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-neutral-500 shrink-0 mt-0.5">{icon}</span>}
      <div>
        <p className="text-neutral-500 text-xs">{label}</p>
        <p className="text-neutral-700">{value}</p>
      </div>
    </div>
  );
}
