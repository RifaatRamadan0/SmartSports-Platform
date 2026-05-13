import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSchedule, upsertSchedule } from '../../services/Schedule/scheduleService';
import ScheduleGrid from '../../components/Schedule/ScheduleGrid';
import { parseApiError } from '../../utils/errorUtils';
import { validateSchedule } from '../../utils/scheduleValidation';

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

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4
        rounded-xl shadow-2xl border text-sm font-medium
        animate-[slideUp_0.3s_ease-out]
        ${type === 'success'
          ? 'bg-[#0f1a12] border-green-600 text-green-400'
          : 'bg-[#1a0f0f] border-red-600 text-red-400'
        }
      `}
    >
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-52 rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse"
        />
      ))}
    </div>
  );
}

function OwnerSchedulePage() {
  const { pitchId } = useParams();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

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

  const closeToast = useCallback(() => setToast(null), []);

  const handleSave = async () => {
    // ── Client-side validation before touching the API ──
    const errors = validateSchedule(schedule);
    if (errors.length > 0) {
      setToast({ message: errors.join(' • '), type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      await upsertSchedule(pitchId, toApiPayload(schedule));
      setToast({ message: 'Schedule saved successfully.', type: 'success' });
      setTimeout(() => navigate('/dashboard/pitches'), 1500);
    } catch (err) {
      // ── Centralized error parsing instead of inline logic ──
      setToast({ message: parseApiError(err, 'Failed to save schedule. Please try again.'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">

      <div className="mb-10 flex flex-col gap-1">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-green-500">
          Pitch Management
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Weekly Schedule
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Set opening hours and toggle availability for each day.
        </p>
      </div>

      {error && !isLoading && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-800 bg-[#1a0f0f] px-5 py-4 text-sm text-red-400">
          <span>✕</span>
          <span>{error}</span>
          <button
            onClick={fetchSchedule}
            className="ml-auto text-xs underline underline-offset-2 hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <ScheduleSkeleton />
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
                ? 'bg-green-900 text-green-600 cursor-not-allowed'
                : 'bg-green-500 text-black hover:bg-green-400 active:scale-95'
              }
            `}
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </button>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  );
}

export default OwnerSchedulePage;