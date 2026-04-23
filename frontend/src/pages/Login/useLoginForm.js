import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api from '../../services/api'

export function useLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ emailOrUsername: '', password: '' })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const { data } = await api.post('/api/auth/login', form)
      login(data)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    error,
    isSubmitting,
    handleChange,
    handleSubmit,
  }
}
