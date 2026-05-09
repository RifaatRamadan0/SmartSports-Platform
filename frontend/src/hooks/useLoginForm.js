import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import api from '../services/api'
import { parseApiError } from '../utils/errorUtils'

export function useLoginForm() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

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
      const isPitchOwner = data.roles?.includes('PitchOwner')
      navigate(isPitchOwner ? '/pending-approval' : '/dashboard', { replace: true })
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
