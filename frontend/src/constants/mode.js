// Active "mode" for users who hold both Player and PitchOwner roles.
// Drives which nav set is shown and where the logo/home link lands.
// Persisted in localStorage so the choice survives a refresh.
export const MODES = {
  PLAYER: 'player',
  OWNER: 'owner',
}

export const ACTIVE_MODE_KEY = 'ss_active_mode'
