// Shared UI and domain constants.
// Import from here instead of redefining locally to keep values in sync.

export const SLOT_DURATION_MINUTES = 30

export const BOOKINGS_PAGE_SIZE = 10

// 1-hour buffer before booking start — mirrors the backend cancellation rule.
export const CANCEL_BUFFER_MS = 60 * 60 * 1000

// Day name arrays in three formats.
// Long: schedule editor, pitch detail
// Short: slot picker header (3-char capitalized)
// Abbr: booking page date strip (3-char uppercase)
export const DAY_NAMES_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES_ABBR  = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
