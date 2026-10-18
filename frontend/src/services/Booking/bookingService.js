import api from "../api";

//player
export async function getMyBookings({ status, from, to, page = 1, pageSize = 10} = {})
{
    const params = { page, pageSize }
    if (status) params.status = status
    if (from) params.from = from
    if (to) params.to = to

    const { data } = await api.get('/api/bookings/my', { params })
    return data
}

//owner
export async function getOwnerBookings({ status, from, to, page = 1, pageSize = 10 } = {}) {
  const params = { page, pageSize }
  if (status) params.status = status
  if (from)   params.from   = from
  if (to)     params.to     = to

  const { data } = await api.get('/api/bookings/owner', { params })
  return data
}


//shared
export async function getBookingById(id) {
  const { data } = await api.get(`/api/bookings/${id}`)
  return data
}

//player
export async function createBooking({ pitchId, bookingDate, startTime, durationInMinutes, isOpenToJoin = true }) {
  const { data } = await api.post('/api/bookings', {
    pitchId,
    bookingDate,
    startTime,
    durationInMinutes,
    isOpenToJoin,
  })
  return data
}

//player — PATCH /api/bookings/{id}/cancel
export async function cancelBooking(id, cancellationReason) {
  await api.patch(`/api/bookings/${id}/cancel`, {
    cancellationReason: cancellationReason ?? null,
  })
}

//owner — PATCH /api/bookings/{id}/owner-cancel
export async function ownerCancelBooking(id, cancellationReason) {
  await api.patch(`/api/bookings/${id}/owner-cancel`, {
    cancellationReason: cancellationReason ?? null,
  })
}
