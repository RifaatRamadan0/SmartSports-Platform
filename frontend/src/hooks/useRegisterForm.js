import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { parseApiError } from '../utils/errorUtils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^((\+?961\s?|0)3|(\+?961\s?)?(70|71|76|78|79|81|82))\s?\d{3}\s?\d{3}$/
const DEBOUNCE_MS = 700

export function useRegisterForm() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Player',
    skillLevel: null,
    preferredPosition: '',
    phoneNumber: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  // 'idle' | 'checking' | 'available' | 'taken'
  const [availability, setAvailability] = useState({ username: 'idle', email: 'idle', phoneNumber: 'idle' })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const usernameAbortRef = useRef(null)
  const emailAbortRef    = useRef(null)
  const phoneAbortRef    = useRef(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'username' || name === 'email' || name === 'phoneNumber') {
      if (name !== 'phoneNumber') {
        setAvailability(prev => ({ ...prev, [name]: 'idle' }))
      } else {
        setAvailability(prev => ({ ...prev, phoneNumber: 'idle' }))
      }
      setFieldErrors(prev => {
        if (!prev[name]) return prev
        const { [name]: _, ...rest } = prev
        return rest
      })
    }
  }

  function setField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // Debounced availability check — independent per field so typing in one
  // doesn't reset the other's already-resolved status.
  useEffect(() => {
    const username = form.username.trim()
    if (username.length < 3 || username.length > 50) return

    setAvailability(prev => ({ ...prev, username: 'checking' }))

    const timer = setTimeout(async () => {
      usernameAbortRef.current?.abort()
      const controller = new AbortController()
      usernameAbortRef.current = controller
      try {
        const { data } = await api.get('/api/auth/check-availability', {
          params: { username },
          signal: controller.signal,
        })
        if (data.usernameAvailable != null) {
          setAvailability(prev => ({
            ...prev,
            username: data.usernameAvailable ? 'available' : 'taken',
          }))
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        setAvailability(prev => ({ ...prev, username: 'idle' }))
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [form.username])

  useEffect(() => {
    const email = form.email.trim()
    if (!EMAIL_RE.test(email)) return

    setAvailability(prev => ({ ...prev, email: 'checking' }))

    const timer = setTimeout(async () => {
      emailAbortRef.current?.abort()
      const controller = new AbortController()
      emailAbortRef.current = controller
      try {
        const { data } = await api.get('/api/auth/check-availability', {
          params: { email },
          signal: controller.signal,
        })
        if (data.emailAvailable != null) {
          setAvailability(prev => ({
            ...prev,
            email: data.emailAvailable ? 'available' : 'taken',
          }))
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        setAvailability(prev => ({ ...prev, email: 'idle' }))
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [form.email])

  useEffect(() => {
    const phone = form.phoneNumber.trim()
    if (!PHONE_RE.test(phone)) return

    setAvailability(prev => ({ ...prev, phoneNumber: 'checking' }))

    const timer = setTimeout(async () => {
      phoneAbortRef.current?.abort()
      const controller = new AbortController()
      phoneAbortRef.current = controller
      try {
        const { data } = await api.get('/api/auth/check-availability', {
          params: { phoneNumber: phone },
          signal: controller.signal,
        })
        if (data.phoneNumberAvailable != null) {
          setAvailability(prev => ({
            ...prev,
            phoneNumber: data.phoneNumberAvailable ? 'available' : 'taken',
          }))
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        setAvailability(prev => ({ ...prev, phoneNumber: 'idle' }))
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [form.phoneNumber])

  useEffect(() => () => {
    usernameAbortRef.current?.abort()
    emailAbortRef.current?.abort()
    phoneAbortRef.current?.abort()
  }, [])

  function validateStep1() {
    const e = {}
    const trimmedUsername = form.username.trim()
    if (!trimmedUsername) e.username = 'Required'
    else if (trimmedUsername.length < 3) e.username = 'At least 3 characters'
    else if (trimmedUsername.length > 50) e.username = 'Max 50 characters'
    else if (availability.username === 'taken') e.username = 'Username is already taken'
    if (!form.email.trim()) e.email = 'Required'
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email'
    else if (availability.email === 'taken') e.email = 'Email is already in use'
    if (!form.password) e.password = 'Required'
    else if (form.password.length < 8) e.password = 'At least 8 characters'
    const trimmedPhone = form.phoneNumber.trim()
    if (!trimmedPhone) e.phoneNumber = 'Required'
    else if (!PHONE_RE.test(trimmedPhone)) e.phoneNumber = 'Enter a valid phone number'
    else if (availability.phoneNumber === 'taken') e.phoneNumber = 'Phone number is already registered.'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  function handleStep1(e) {
    e.preventDefault()
    setError(null)
    if (!validateStep1()) return
    if (
      availability.username  === 'checking' ||
      availability.email     === 'checking' ||
      availability.phoneNumber === 'checking'
    ) return
    setStep(2)
  }

  function back() {
    setError(null)
    setStep(1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const payload = {
      username: form.username,
      email: form.email,
      password: form.password,
      role: form.role,
      phoneNumber: form.phoneNumber.trim(),
    }
    if (form.role === 'Player') {
      if (form.skillLevel) payload.skillLevel = form.skillLevel
      if (form.preferredPosition) payload.preferredPosition = form.preferredPosition
    }

    try {
      await api.post('/api/auth/register', payload)
      navigate('/verify-email', { state: { email: form.email }, replace: true })
    } catch (err) {
      const msg = parseApiError(err, 'Registration failed. Please try again.')
      const lower = msg.toLowerCase()
      const next = {}
      if (lower.includes('username')) {
        next.username = msg
        setAvailability(prev => ({ ...prev, username: 'taken' }))
      } else if (lower.includes('email')) {
        next.email = msg
        setAvailability(prev => ({ ...prev, email: 'taken' }))
      } else if (lower.includes('phone')) {
        next.phoneNumber = msg
      }
      if (Object.keys(next).length) {
        setFieldErrors(prev => ({ ...prev, ...next }))
      } else {
        setError(msg)
      }
      setStep(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    step,
    error,
    fieldErrors,
    availability,
    isSubmitting,
    handleChange,
    setField,
    handleStep1,
    handleSubmit,
    back,
  }
}
