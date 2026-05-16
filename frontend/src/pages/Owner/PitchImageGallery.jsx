import { useState, useEffect, useRef, useCallback } from 'react'
import {
  listImages,
  addImage,
  setCover,
  deleteImage,
} from '../../services/Pitch/pitchImageService'
import { uploadToImageKit, isImageKitConfigured } from '../../services/imagekit'
import { parseApiError } from '../../utils/errorUtils'

const MAX_IMAGES = 8

export default function PitchImageGallery({ pitchId }) {
  const fileInputRef = useRef(null)
  const uploadReady = isImageKitConfigured()

  const [images,      setImages]      = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [loadError,   setLoadError]   = useState(null)
  const [isBusy,      setIsBusy]      = useState(false)
  const [actionError, setActionError] = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await listImages(pitchId)
      setImages(data ?? [])
    } catch (err) {
      setLoadError(parseApiError(err, 'Failed to load images.'))
    } finally {
      setIsLoading(false)
    }
  }, [pitchId])

  useEffect(() => { reload() }, [reload])

  const atLimit = images.length >= MAX_IMAGES

  // — Upload via file picker —
  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-uploading the same file later
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setActionError('Please pick an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionError('Image is larger than 5 MB.')
      return
    }

    setIsBusy(true)
    setActionError(null)
    try {
      const { url } = await uploadToImageKit(file)
      const created = await addImage(pitchId, {
        imageUrl: url,
        isCover:  images.length === 0,
      })
      setImages(prev => [...prev, created])
    } catch (err) {
      setActionError(err.response ? parseApiError(err, 'Failed to add the image.') : err.message)
    } finally {
      setIsBusy(false)
    }
  }

  // — Set cover —
  const handleSetCover = async (imageId) => {
    setIsBusy(true)
    setActionError(null)
    try {
      const updated = await setCover(pitchId, imageId)
      setImages(prev =>
        prev
          .map(img => ({ ...img, isCover: img.id === updated.id }))
          .sort((a, b) => (b.isCover - a.isCover) || (a.displayOrder - b.displayOrder) || (a.id - b.id))
      )
    } catch (err) {
      setActionError(parseApiError(err, 'Failed to update the cover image.'))
    } finally {
      setIsBusy(false)
    }
  }

  // — Delete —
  const handleDelete = async (imageId) => {
    setIsBusy(true)
    setActionError(null)
    try {
      await deleteImage(pitchId, imageId)
      setImages(prev => prev.filter(img => img.id !== imageId))
      setConfirmId(null)
    } catch (err) {
      setActionError(parseApiError(err, 'Failed to delete the image.'))
    } finally {
      setIsBusy(false)
    }
  }

  // — Render —

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">Photos</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Add up to {MAX_IMAGES} images. One can be marked as the cover shown on listings.
          </p>
        </div>
        <span className="text-xs text-neutral-500 font-mono">
          {images.length} / {MAX_IMAGES}
        </span>
      </div>

      {!uploadReady && (
        <p className="text-xs text-amber-300 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          ImageKit isn't configured — image upload is disabled. Set the
          VITE_IMAGEKIT_URL_ENDPOINT and VITE_IMAGEKIT_PUBLIC_KEY env vars.
        </p>
      )}

      {/* Add controls */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePickFile}
            disabled={atLimit || isBusy || !uploadReady}
            className="rounded-xl px-4 py-2 text-xs font-semibold
                       bg-green-500 text-black hover:bg-green-400
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBusy ? 'Uploading…' : 'Upload image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {atLimit && (
          <p className="text-xs text-neutral-500">
            Limit reached ({MAX_IMAGES} / {MAX_IMAGES}). Delete an image to add another.
          </p>
        )}

        {actionError && (
          <p className="text-xs text-red-300 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
            {actionError}
          </p>
        )}
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center">
          <p className="text-xs text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[#141414] border border-[#1f1f1f] text-white hover:border-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] py-10 text-center">
          <p className="text-xs text-neutral-500">No images yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map(img => (
            <div
              key={img.id}
              className="relative group rounded-xl overflow-hidden border border-[#1a1a1a] bg-[#0d0d0d]"
            >
              <div className="aspect-[4/3] bg-[#080808]">
                <img
                  src={img.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.opacity = '0.3' }}
                />
              </div>

              {img.isCover && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider
                                 bg-green-500 text-black">
                  COVER
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-2">
                {!img.isCover ? (
                  <button
                    type="button"
                    onClick={() => handleSetCover(img.id)}
                    disabled={isBusy}
                    className="flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold
                               bg-[#141414]/90 border border-white/10 text-white hover:border-white/25
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Set as cover
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                {confirmId === img.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(img.id)}
                      disabled={isBusy}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-red-500 text-white hover:bg-red-400 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={isBusy}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-[#141414]/90 border border-white/10 text-white hover:border-white/25 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(img.id)}
                    disabled={isBusy}
                    aria-label="Delete image"
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold
                               bg-[#141414]/90 border border-white/10 text-white hover:border-red-500/60 hover:text-red-300
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
