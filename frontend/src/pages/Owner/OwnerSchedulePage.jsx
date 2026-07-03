import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSchedule, upsertSchedule } from '../../services/Schedule/scheduleService';
import ScheduleGrid from '../../components/Schedule/ScheduleGrid';
import { parseApiError } from '../../utils/errorUtils';
import { validateSchedule } from '../../utils/scheduleValidation';
import { useToast } from '../../context/ToastContext';
import { GridSkeleton } from '../../components/ui/Skeleton';

const buildDefaultSchedule = () =>
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: '08:00:00',
    closeTime: '22:00:00',
    isActive: i !== 0,
  }));

const normalizeSchedule = (apiData) => {
  const base = buildDefaultSchedule();
  if (!apiData || apiData.length === 0) return base;

  return base.map((defaultDay) => {
    const match = apiData.find((d) => d.dayOfWeek === defaultDay.dayOfWeek);
    return match
      ? {
          dayOfWeek: match.dayOfWeek,
          openTime: match.openTime,
          closeTime: match.closeTime,
          isActive: match.isActive,
        }
      : defaultDay;
  });
};

const toApiPayload = (schedule) =>
  schedule.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    openTime: day.openTime,
    closeTime: day.closeTime,
    isActive: day.isActive,
  }));

function OwnerSchedulePage() {
  const { pitchId } = useParams();
  const navigate = useNavigate();
  const navTimerRef = useRef(null);

  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => () => clearTimeout(navTimerRef.current), []);

  // useCallback prevents fetchSchedule from being recreated on every render
  // while still allowing it to be called from both useEffect and the Retry button
  const fetchSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSchedule(pitchId);
      setSchedule(normalizeSchedule(data));
    } catch (err) {
      setError(parseApiError(err, 'Failed to load schedule. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [pitchId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleSave = async () => {
    // ── Client-side validation before touching the API ──
    const errors = validateSchedule(schedule);
    if (errors.length > 0) {
      toast.error(errors.join(' • '));
      return;
    }

    try {
      clearTimeout(navTimerRef.current);
      setIsSaving(true);
      await upsertSchedule(pitchId, toApiPayload(schedule));
      toast.success('Schedule saved successfully.');
      navTimerRef.current = setTimeout(() => navigate('/dashboard/pitches'), 1500);
    } catch (err) {
      // ── Centralized error parsing instead of inline logic ──
      toast.error(parseApiError(err, 'Failed to save schedule. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">

      <div className="mb-10 flex flex-col gap-1">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--green)]">
          Pitch Management
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Weekly Schedule
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">
          Set opening hours and toggle availability for each day.
        </p>
      </div>

      {error && !isLoading && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--red)] bg-[var(--red-muted)] px-5 py-4 text-sm text-[var(--red)]">
          <span>✕</span>
          <span>{error}</span>
          <button
            onClick={fetchSchedule}
            className="ml-auto text-xs underline underline-offset-2 hover:text-[var(--red)]"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <GridSkeleton count={7} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7" height="h-52" gap="gap-3" />
      ) : !error ? (
        <ScheduleGrid
          schedule={schedule}
          onChange={setSchedule}
          disabled={isSaving}
        />
      ) : null}

      {!isLoading && !error && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`
              flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold
              tracking-wide transition-all duration-200
              ${isSaving
                ? 'bg-[var(--green-muted)] text-[var(--green-dim)] cursor-not-allowed'
                : 'bg-[var(--green)] text-black hover:brightness-110 active:scale-95'
              }
            `}
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-[var(--green-dim)] border-t-transparent animate-spin" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default OwnerSchedulePage;