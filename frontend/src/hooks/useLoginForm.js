import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { ROLES } from '../constants/roles'
import api from '../services/api'
import { parseApiError } from '../utils/errorUtils'

export function useLoginForm() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()

  const [form, setForm]           = useState({ emailOrUsername: '', password: '' })
  const [error, setError]         = useState(null)
  const [unverified, setUnverified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (unverified) setUnverified(false)
    if (error) setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setUnverified(false)

    try {
      const { data } = await api.post('/api/auth/login', form)
      login(data)
      const isPlayer     = data.roles?.includes(ROLES.PLAYER)
      const isPitchOwner = data.roles?.includes(ROLES.PITCH_OWNER)
      const fallback     = isPitchOwner ? '/dashboard' : '/dashboard'
      const from = location.state?.from
      const safePath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
      navigate(isPlayer && safePath ? from : fallback, { replace: true })
    } catch (err) {
      if (err.response?.status === 403) {
        setUnverified(true)
      } else {
        setError(parseApiError(err, 'Invalid credentials. Please try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    error,
    unverified,
    isSubmitting,
    handleChange,
    handleSubmit,
  }
}
