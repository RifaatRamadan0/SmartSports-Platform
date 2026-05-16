import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createPitch,
  updatePitch,
  getMyPitchById,
} from '../../services/Pitch/pitchService'
import { listCities, listSportTypes } from '../../services/Lookup/lookupService'
import { parseApiError } from '../../utils/errorUtils'
import PitchImageGallery from './PitchImageGallery'

const DURATION_OPTIONS = []
for (let m = 60; m <= 480; m += 30) DURATION_OPTIONS.push(m)

const formatDuration = m => (m % 60 === 0 ? `${m / 60} hr` : `${(m / 60).toFixed(1)} hr`)

const EMPTY_FORM = {
  regionId:                  '',
  cityId:                    '',
  sportTypeId:               '',
  name:                      '',
  address:                   '',
  pricePerHour:              '',
  latitude:                  '',
  longitude:                 '',
  maxBookingDurationMinutes: 120,
  isActive:                  true,
}

// Validation

function validate(form) {
  const errors = {}

  if (!form.regionId)    errors.regionId    = 'Pick a region.'
  if (!form.cityId)      errors.cityId      = 'Pick a city.'
  if (!form.sportTypeId) errors.sportTypeId = 'Pick a sport.'

  const name = form.name.trim()
  if (name.length < 2 || name.length > 120) errors.name = 'Name must be 2–120 characters.'

  const address = form.address.trim()
  if (address.length < 2 || address.length > 255) errors.address = 'Address must be 2–255 characters.'

  const price = Number(form.pricePerHour)
  if (!Number.isFinite(price) || price <= 0) errors.pricePerHour = 'Price must be greater than 0.'

  if (form.latitude !== '' && form.latitude !== null) {
    const lat = Number(form.latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be between -90 and 90.'
  }
  if (form.longitude !== '' && form.longitude !== null) {
    const lon = Number(form.longitude)
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.longitude = 'Longitude must be between -180 and 180.'
  }

  const dur = Number(form.maxBookingDurationMinutes)
  if (!Number.isFinite(dur) || dur < 60 || dur > 480 || dur % 30 !== 0)
    errors.maxBookingDurationMinutes = 'Duration must be 60–480 minutes in 30-minute steps.'

  return errors
}

function buildPayload(form, mode) {
  const payload = {
    cityId:                    Number(form.cityId),
    sportTypeId:               Number(form.sportTypeId),
    name:                      form.name.trim(),
    address:                   form.address.trim(),
    pricePerHour:              Number(form.pricePerHour),
    latitude:                  form.latitude  === '' ? null : Number(form.latitude),
    longitude:                 form.longitude === '' ? null : Number(form.longitude),
    maxBookingDurationMinutes: Number(form.maxBookingDurationMinutes),
  }
  if (mode === 'edit') payload.isActive = !!form.isActive
  return payload
}

// Small UI helpers

const inputClass =
  'w-full rounded-xl px-3.5 py-2.5 text-sm bg-[#0d0d0d] border border-[#1f1f1f] text-white ' +
  'placeholder:text-neutral-600 focus:outline-none focus:border-green-500/60 transition-colors'

function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-neutral-300">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

// Page

export default function OwnerPitchFormPage() {
  const navigate = useNavigate()
  const { pitchId } = useParams()
  const mode = pitchId ? 'edit' : 'create'
  const isEdit = mode === 'edit'

  const [form,        setForm]        = useState(EMPTY_FORM)
  const [errors,      setErrors]      = useState({})
  const [cities,      setCities]      = useState([])
  const [sportTypes,  setSportTypes]  = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [loadError,   setLoadError]   = useState(null)
  const [isSubmitting,setIsSubmitting]= useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Initial load

  const loadInitial = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [citiesData, sportsData] = await Promise.all([listCities(), listSportTypes()])
      setCities(citiesData ?? [])
      setSportTypes(sportsData ?? [])

      if (isEdit) {
        const pitch = await getMyPitchById(pitchId)
        const pitchCity = (citiesData ?? []).find(c => c.id === pitch.cityId)
        setForm({
          regionId:                  pitchCity ? String(pitchCity.regionId) : '',
          cityId:                    String(pitch.cityId      ?? ''),
          sportTypeId:               String(pitch.sportTypeId ?? ''),
          name:                      pitch.name    ?? '',
          address:                   pitch.address ?? '',
          pricePerHour:              pitch.pricePerHour != null ? String(pitch.pricePerHour) : '',
          latitude:                  pitch.latitude  != null ? String(pitch.latitude)  : '',
          longitude:                 pitch.longitude != null ? String(pitch.longitude) : '',
          maxBookingDurationMinutes: pitch.maxBookingDurationMinutes ?? 120,
          isActive:                  !!pitch.isActive,
        })
      }
    } catch (err) {
      setLoadError(parseApiError(err, 'Failed to load the form. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [isEdit, pitchId])

  useEffect(() => { loadInitial() }, [loadInitial])

  // Handlers

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const handleRegionChange = value => {
    setForm(prev => ({ ...prev, regionId: value, cityId: '' }))
    if (errors.regionId) setErrors(prev => ({ ...prev, regionId: undefined }))
    if (errors.cityId)   setErrors(prev => ({ ...prev, cityId:   undefined }))
  }

  const regions = (() => {
    const seen = new Map()
    for (const c of cities) {
      if (!seen.has(c.regionId)) seen.set(c.regionId, { id: c.regionId, name: c.regionName })
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  })()

  const filteredCities = form.regionId
    ? cities.filter(c => String(c.regionId) === String(form.regionId))
    : []

  const handleSubmit = async e => {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const payload = buildPayload(form, mode)
      if (isEdit) {
        await updatePitch(pitchId, payload)
      } else {
        await createPitch(payload)
      }
      navigate('/dashboard/pitches')
    } catch (err) {
      setSubmitError(parseApiError(err, `Failed to ${isEdit ? 'update' : 'create'} the pitch.`))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
        <div className="max-w-3xl">
          <div className="h-8 w-48 rounded bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
        <div className="max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300">{loadError}</p>
          <button
            onClick={loadInitial}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold
                       bg-[#141414] border border-[#1f1f1f] text-white
                       hover:border-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
      <div className="max-w-3xl">

        {/* Header */}
        <button
          onClick={() => navigate('/dashboard/pitches')}
          className="text-xs text-neutral-500 hover:text-white transition-colors mb-3"
        >
          ← Back to My Pitches
        </button>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-green-500">
          Pitch Management
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? 'Edit Pitch' : 'Add New Pitch'}
        </h1>
        <p className="text-sm text-neutral-500 mt-1 mb-8">
          {isEdit
            ? 'Update your pitch details. Changes go live immediately for approved listings.'
            : 'New listings are reviewed by an admin before appearing in public search results.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          <Field label="Pitch name" htmlFor="name" error={errors.name}>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="e.g. Arena North"
            />
          </Field>

          <Field label="Address" htmlFor="address" error={errors.address}>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              maxLength={255}
              className={inputClass}
              placeholder="Street, neighbourhood"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Region" htmlFor="regionId" error={errors.regionId}>
              <select
                id="regionId"
                value={form.regionId}
                onChange={e => handleRegionChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a region</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>

            <Field
              label="City"
              htmlFor="cityId"
              error={errors.cityId}
              hint={!form.regionId ? 'Pick a region first.' : undefined}
            >
              <select
                id="cityId"
                value={form.cityId}
                onChange={e => setField('cityId', e.target.value)}
                disabled={!form.regionId}
                className={inputClass + (form.regionId ? '' : ' opacity-60 cursor-not-allowed')}
              >
                <option value="">{form.regionId ? 'Select a city' : 'Pick a region first'}</option>
                {filteredCities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Sport" htmlFor="sportTypeId" error={errors.sportTypeId}>
            <select
              id="sportTypeId"
              value={form.sportTypeId}
              onChange={e => setField('sportTypeId', e.target.value)}
              className={inputClass}
            >
              <option value="">Select a sport</option>
              {sportTypes.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Price per hour ($)" htmlFor="pricePerHour" error={errors.pricePerHour}>
              <input
                id="pricePerHour"
                type="number"
                min="0.01"
                step="0.01"
                value={form.pricePerHour}
                onChange={e => setField('pricePerHour', e.target.value)}
                className={inputClass}
                placeholder="35.00"
              />
            </Field>

            <Field
              label="Max booking duration"
              htmlFor="maxBookingDurationMinutes"
              error={errors.maxBookingDurationMinutes}
              hint="Players can't book a single slot longer than this."
            >
              <select
                id="maxBookingDurationMinutes"
                value={form.maxBookingDurationMinutes}
                onChange={e => setField('maxBookingDurationMinutes', Number(e.target.value))}
                className={inputClass}
              >
                {DURATION_OPTIONS.map(m => (
                  <option key={m} value={m}>{formatDuration(m)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Latitude (optional)" htmlFor="latitude" error={errors.latitude}>
              <input
                id="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => setField('latitude', e.target.value)}
                className={inputClass}
                placeholder="33.8938"
              />
            </Field>

            <Field label="Longitude (optional)" htmlFor="longitude" error={errors.longitude}>
              <input
                id="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => setField('longitude', e.target.value)}
                className={inputClass}
                placeholder="35.5018"
              />
            </Field>
          </div>

          {isEdit && (
            <Field
              label="Visibility"
              htmlFor="isActive"
              hint="Inactive listings are hidden from search but bookings on existing slots are unaffected."
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setField('isActive', e.target.checked)}
                  className="h-4 w-4 accent-green-500"
                />
                <span className="text-sm text-neutral-300">Active — visible to players</span>
              </label>
            </Field>
          )}

          {submitError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
              {submitError}
            </div>
          )}

          {isEdit ? (
            <div className="pt-4 border-t border-[#1a1a1a]">
              <PitchImageGallery pitchId={pitchId} />
            </div>
          ) : (
            <p className="text-xs text-neutral-500 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2">
              Save the pitch first to add images.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold
                         bg-green-500 text-black hover:bg-green-400
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? (isEdit ? 'Saving…' : 'Creating…')
                : (isEdit ? 'Save changes' : 'Create pitch')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/pitches')}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold
                         bg-[#141414] border border-[#1f1f1f] text-neutral-300
                         hover:text-white hover:border-white/15
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
