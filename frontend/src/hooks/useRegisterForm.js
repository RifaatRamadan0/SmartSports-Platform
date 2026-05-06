import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import api from '../services/api'
import { parseApiError } from '../utils/errorUtils'

export function useRegisterForm() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Player',
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { data } = await api.post('/api/auth/register', form)
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(parseApiError(err, 'Registration failed. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return { form, error, isSubmitting, handleChange, handleSubmit }
}
