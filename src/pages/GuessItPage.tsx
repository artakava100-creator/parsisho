import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, ArrowRight, ArrowLeft, CheckCircle2, XCircle,
  Wallet, Clock, AlertCircle, Hash,
  Trophy, RefreshCw, Lock, Ticket, Users, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGuessItRounds, useSubmitGuess } from '@/hooks/useGame';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import type { PublicGameRound } from '@/services/game.service';
import type { SubmitGuessResult } from '@/services/game.service';

type ViewState = 'list' | 'detail' | 'result';

interface AttemptResult {
  isCorrect: boolean;
  qualificationStatus: string;
  resultType: string;
  message: string;
  entryId: string;
  idempotentReplay: boolean;
}

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const isExpired = remaining === 0;

  return { days, hours, minutes, seconds, isExpired };
}

function formatCountdown(days: number, hours: number, minutes: number, seconds: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${toPersianDigits(days)} روز`);
  parts.push(
    toPersianDigits(String(hours).padStart(2, '0')),
    toPersianDigits(String(minutes).padStart(2, '0')),
    toPersianDigits(String(seconds).padStart(2, '0')),
  );
  if (days > 0) {
    return parts[0] + ' ' + parts.slice(1).join(':');
  }
  return parts.join(':');
}

/* ── Countdown pill ── */
function CountdownPill({ endsAt, isActive }: { endsAt: string; isActive: boolean }) {
  const { hours, minutes, seconds, isExpired } = useCountdown(endsAt);
  if (!isActive || isExpired) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-500/20">
      <Clock className="w-3.5 h-3.5 text-primary-600" />
      <span className="text-xs font-bold text-primary-700 tabular-nums">
        {formatCountdown(0, hours, minutes, seconds)}
      </span>
    </div>
  );
}

/* ── Round card (list view) ── */
function RoundCard({
  round,
  onSelect,
}: {
  round: PublicGameRound;
  onSelect: () => void;
}) {
  const { isExpired } = useCountdown(round.endsAt);
  const isActive = round.status === 'active' && !isExpired;

  return (
    <Card
      hover={isActive}
      className={`p-0 overflow-hidden h-full flex flex-col animate-fade-in-up border ${isActive ? 'border-primary-500/25' : 'border-neutral-200/60'} ${!isActive ? 'opacity-70' : ''}`}
    >
      {/* Challenge visual area */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-surface-raised to-surface-sunken overflow-hidden">
        {round.displayImagePath ? (
          <img
            src={round.displayImagePath}
            alt={round.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/12 flex items-center justify-center">
              <Brain className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        )}
        {/* Gradient scrim for badge legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-sunken/80 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          {isActive ? (
            <Badge tone="success" variant="solid">
              <span className="w-1.5 h-1.5 rounded-full bg-success-950 animate-pulse" />
              فعال
            </Badge>
          ) : isExpired ? (
            <Badge tone="neutral" variant="soft">به پایان رسیده</Badge>
          ) : (
            <Badge tone="warning" variant="soft">{round.status}</Badge>
          )}
        </div>
        {/* Prize badge on image */}
        {round.prizeAmount > 0 && (
          <div className="absolute bottom-3 right-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-sunken/80 backdrop-blur-sm border border-accent-500/30">
              <Trophy className="w-3.5 h-3.5 text-accent-600" />
              <span className="text-xs font-bold text-accent-700">{formatCurrency(round.prizeAmount)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3.5">
        {/* Question */}
        <div>
          <h3 className="text-lg font-bold text-neutral-800">{round.title}</h3>
          <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed line-clamp-2">{round.question}</p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" />
            {round.entryFee > 0 ? formatCurrency(round.entryFee) : 'رایگان'}
          </span>
          {isActive && <CountdownPill endsAt={round.endsAt} isActive={isActive} />}
          <span className="inline-flex items-center gap-1">
            {round.answerType === 'number' ? <Hash className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
            {round.answerType === 'number' ? 'عددی' : 'متنی'}
          </span>
        </div>

        {/* Action */}
        <div className="pt-1 mt-auto">
          <Button
            variant={isActive ? 'primary' : 'outline'}
            fullWidth
            size="md"
            disabled={!isActive}
            onClick={onSelect}
          >
            {isActive ? (
              <>
                شرکت در دور
                <ArrowLeft className="w-4 h-4" />
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                {isExpired ? 'به پایان رسیده' : 'غیرفعال'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Round detail (game play view) ── */
function RoundDetail({
  round,
  onBack,
  onResult,
}: {
  round: PublicGameRound;
  onBack: () => void;
  onResult: (result: AttemptResult) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const { hours, minutes, seconds, isExpired } = useCountdown(round.endsAt);
  const submitMutation = useSubmitGuess();
  const { data: wallet } = useWallet();
  const balance = wallet?.availableBalance;

  const isActive = round.status === 'active' && !isExpired;
  const insufficientBalance = balance !== undefined && balance < round.entryFee;

  useEffect(() => {
    if (isExpired) {
      setSubmitError('این دور به پایان رسیده است');
    }
  }, [isExpired]);

  const handleSubmit = useCallback(async () => {
    if (!answer.trim()) {
      setSubmitError('پاسخ الزامی است');
      return;
    }
    if (!isActive) {
      setSubmitError('این دور در حال حاضر قابل بازی نیست');
      return;
    }
    if (insufficientBalance) {
      setSubmitError('موجودی پارسی شما کافی نیست');
      return;
    }

    setSubmitError(null);
    try {
      const result: SubmitGuessResult = await submitMutation.mutateAsync({
        roundId: round.id,
        submittedAnswer: answer.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      });

      onResult({
        isCorrect: result.isCorrect ?? false,
        qualificationStatus: result.qualificationStatus ?? 'not_qualified',
        resultType: result.resultType ?? 'incorrect',
        message: result.message ?? '',
        entryId: result.entryId ?? '',
        idempotentReplay: result.idempotentReplay ?? false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در ثبت پاسخ';
      setSubmitError(message);
    }
  }, [answer, isActive, insufficientBalance, round.id, submitMutation, onResult]);

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-700 transition-colors mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        بازگشت به لیست دورها
      </button>

      <Card className="p-0 overflow-hidden border border-primary-500/20">
        {/* ── Challenge area ── */}
        {round.displayImagePath ? (
          <div className="relative aspect-[16/9] bg-neutral-100 overflow-hidden">
            <img
              src={round.displayImagePath}
              alt={round.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-sunken/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative aspect-[16/9] bg-gradient-to-br from-primary-950/40 via-surface-raised to-surface-sunken overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-primary-500/12 flex items-center justify-center">
                <Brain className="w-10 h-10 text-primary-600" />
              </div>
            </div>
          </div>
        )}

        {/* ── Info + question + answer ── */}
        <div className="p-6 lg:p-8 space-y-6">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={isActive ? 'success' : 'neutral'} variant={isActive ? 'solid' : 'soft'}>
              {isActive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-success-950 animate-pulse" />
                  فعال
                </>
              ) : (
                round.status
              )}
            </Badge>
            <Badge tone="primary" variant="soft">
              {round.answerType === 'number' ? (
                <><Hash className="w-3 h-3" /> پاسخ عددی</>
              ) : (
                <><Brain className="w-3 h-3" /> پاسخ متنی</>
              )}
            </Badge>
            {round.maxEntriesPerUser > 1 && (
              <Badge tone="neutral" variant="soft">
                <RefreshCw className="w-3 h-3" />
                {toPersianDigits(round.maxEntriesPerUser)} پاسخ مجاز
              </Badge>
            )}
          </div>

          {/* ── Question area ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary-500" />
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">چالش</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-neutral-800 mb-2">{round.title}</h2>
            <p className="text-base lg:text-lg text-neutral-600 leading-relaxed">{round.question}</p>
          </div>

          {/* ── Entry fee / prize / time info bar ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-surface-sunken/60 border border-neutral-200/60">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-primary-600" />
                </div>
              </div>
              <p className="text-xs text-neutral-500 mb-0.5">هزینه شرکت</p>
              <p className="text-sm font-bold text-neutral-800">
                {round.entryFee > 0 ? formatCurrency(round.entryFee) : 'رایگان'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-sunken/60 border border-neutral-200/60">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-accent-50 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5 text-accent-600" />
                </div>
              </div>
              <p className="text-xs text-neutral-500 mb-0.5">جایزه دور</p>
              <p className="text-sm font-bold text-accent-700">
                {round.prizeAmount > 0 ? formatCurrency(round.prizeAmount) : '—'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-sunken/60 border border-neutral-200/60">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-secondary-500/10 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-secondary-600" />
                </div>
              </div>
              <p className="text-xs text-neutral-500 mb-0.5">تعداد برندها</p>
              <p className="text-sm font-bold text-neutral-800">
                {toPersianDigits(round.winnerCount)} نفر
              </p>
            </div>
          </div>

          {/* Time remaining bar */}
          {isActive && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary-500/8 border border-primary-500/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-neutral-600">زمان باقیمانده</span>
              </div>
              <span className="text-sm font-bold text-primary-700 tabular-nums">
                {formatCountdown(0, hours, minutes, seconds)}
              </span>
            </div>
          )}

          {/* Balance display */}
          {balance !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-500">موجودی شما:</span>
              <span className={`font-bold ${insufficientBalance ? 'text-error-600' : 'text-neutral-800'}`}>
                {formatCurrency(balance)}
              </span>
            </div>
          )}

          {/* ── Answer interaction ── */}
          <div>
            <Input
              label="پاسخ خود را وارد کنید"
              placeholder={round.answerType === 'number' ? 'مثال: ۴۲' : 'پاسخ خود را بنویسید…'}
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              error={submitError ?? undefined}
              disabled={!isActive || submitMutation.isPending}
              inputMode={round.answerType === 'number' ? 'numeric' : 'text'}
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitMutation.isPending) {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* ── Primary action ── */}
          <Button
            variant="primary"
            fullWidth
            size="lg"
            loading={submitMutation.isPending}
            disabled={!isActive || insufficientBalance || !answer.trim()}
            onClick={handleSubmit}
          >
            {submitMutation.isPending ? 'در حال ثبت…' : 'ثبت پاسخ'}
            {!submitMutation.isPending && <ArrowLeft className="w-4 h-4" />}
          </Button>

          {/* Insufficient balance warning */}
          {insufficientBalance && isActive && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-error-50 border border-error-200">
              <AlertCircle className="w-4 h-4 text-error-600 shrink-0" />
              <p className="text-sm text-error-700">
                موجودی پارسی شما برای شرکت در این دور کافی نیست. کیف پول خود را شارژ کنید.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── Result view ── */
function ResultView({
  result,
  round,
  onPlayAgain,
  onBackToList,
}: {
  result: AttemptResult;
  round: PublicGameRound;
  onPlayAgain: () => void;
  onBackToList: () => void;
}) {
  const isQualified = result.qualificationStatus === 'qualified';

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <Card className="p-0 overflow-hidden">
        {/* Result banner */}
        <div className={`relative h-2 w-full ${isQualified ? 'bg-success-500' : 'bg-error-500'}`} />

        <div className="p-8 lg:p-10 text-center">
          {/* Result icon */}
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
            isQualified
              ? 'bg-success-50 text-success-600'
              : 'bg-error-50 text-error-600'
          }`}>
            {isQualified ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : (
              <XCircle className="w-10 h-10" />
            )}
          </div>

          {/* Result heading */}
          <h2 className="text-2xl lg:text-3xl font-extrabold text-neutral-800 mb-2">
            {isQualified ? 'پاسخ صحیح!' : 'پاسخ نادرست'}
          </h2>

          <p className="text-neutral-500 leading-relaxed mb-6 max-w-md mx-auto">
            {result.message || (isQualified
              ? 'شما برای قرعه‌کشی واجد شرایط شدید.'
              : 'پاسخ شما صحیح نبود.')}
          </p>

          {/* Idempotent replay notice */}
          {result.idempotentReplay && (
            <div className="mb-5">
              <Badge tone="neutral" variant="soft">
                <RefreshCw className="w-3 h-3" />
                این پاسخ قبلاً ثبت شده بود
              </Badge>
            </div>
          )}

          {/* Result detail grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-surface-sunken/60 border border-neutral-200/60">
              <p className="text-xs text-neutral-500 mb-2">وضعیت</p>
              <Badge tone={isQualified ? 'success' : 'error'} variant="soft">
                {isQualified ? 'واجد شرایط' : 'غیرواجد'}
              </Badge>
            </div>
            <div className="p-4 rounded-xl bg-surface-sunken/60 border border-neutral-200/60">
              <p className="text-xs text-neutral-500 mb-1">دور</p>
              <p className="text-sm font-medium text-neutral-700 truncate">{round.title}</p>
            </div>
          </div>

          {/* Qualified — prize highlight */}
          {isQualified && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success-50 border border-success-500/30 mb-8 text-right">
              <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-success-600" />
              </div>
              <p className="text-sm text-success-700 leading-relaxed">
                شما در قرعه‌کشی این دور شرکت می‌کنید. برندگان بعداً اعلام خواهند شد.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" fullWidth size="md" onClick={onBackToList}>
              <ArrowRight className="w-4 h-4" />
              بازگشت به لیست دورها
            </Button>
            <Button variant="primary" fullWidth size="md" onClick={onPlayAgain}>
              بازی دور دیگر
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Page header for Guess It ── */
function GuessItHeader({ onBack }: { onBack: () => void }) {
  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-700 transition-colors mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        بازگشت به سرزمین هیجان
      </button>

      <div className="flex items-center gap-3.5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-500/12 flex items-center justify-center border border-primary-500/20">
          <Brain className="w-7 h-7 text-primary-600" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-neutral-800">حدس بزن</h1>
            <Badge tone="primary" variant="soft">
              <Sparkles className="w-3 h-3" />
              بازی فعال
            </Badge>
          </div>
          <p className="text-sm text-neutral-500">تصویر یا معما را ببین، پاسخ بده و وارد قرعه‌کشی شو</p>
        </div>
      </div>
    </>
  );
}

export function GuessItPage() {
  const navigate = useNavigate();
  const { data: rounds, isLoading, error } = useGuessItRounds();

  const [view, setView] = useState<ViewState>('list');
  const [selectedRound, setSelectedRound] = useState<PublicGameRound | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const activeRounds = (rounds ?? []).filter(
    (r) => r.status === 'active' && new Date(r.endsAt).getTime() > Date.now(),
  );

  const handleSelectRound = (round: PublicGameRound) => {
    setSelectedRound(round);
    setResult(null);
    setView('detail');
  };

  const handleResult = (r: AttemptResult) => {
    setResult(r);
    setView('result');
  };

  const handlePlayAgain = () => {
    setResult(null);
    setSelectedRound(null);
    setView('list');
  };

  const handleBackToList = () => {
    setResult(null);
    setSelectedRound(null);
    setView('list');
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GuessItHeader onBack={() => navigate('/excitement')} />
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="در حال بارگذاری دورها…" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GuessItHeader onBack={() => navigate('/excitement')} />
        <EmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          title="خطا در بارگذاری دورها"
          description="لطفاً دوباره تلاش کنید."
          action={
            <Button variant="outline" size="md" onClick={() => navigate('/excitement')}>
              بازگشت
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {view === 'list' && (
        <>
          <GuessItHeader onBack={() => navigate('/excitement')} />

          {activeRounds.length === 0 ? (
            <EmptyState
              icon={<Brain className="w-8 h-8" />}
              title="دور فعالی وجود ندارد"
              description="در حال حاضر دور فعالی برای بازی «حدس بزن» وجود ندارد. بعداً دوباره بررسی کنید."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRounds.map((round) => (
                <RoundCard
                  key={round.id}
                  round={round}
                  onSelect={() => handleSelectRound(round)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'detail' && selectedRound && (
        <RoundDetail
          round={selectedRound}
          onBack={handleBackToList}
          onResult={handleResult}
        />
      )}

      {view === 'result' && result && selectedRound && (
        <ResultView
          result={result}
          round={selectedRound}
          onPlayAgain={handlePlayAgain}
          onBackToList={handleBackToList}
        />
      )}
    </div>
  );
}
