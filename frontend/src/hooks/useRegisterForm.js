import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { sendPhoneOtp, verifyPhoneOtp } from '../services/api'
import { parseApiError } from '../utils/errorUtils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^((\+?961\s?|0)3|(\+?961\s?)?(70|71|76|78|79|81|82))\s?\d{3}\s?\d{3}$/
const DEBOUNCE_MS = 700
const RESEND_SECONDS = 60

// otpState machine: 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error'

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
  const [availability, setAvailability] = useState({ username: 'idle', email: 'idle', phoneNumber: 'idle' })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // OTP state
  const [otpState, setOtpState] = useState('idle')
  const [otpError, setOtpError] = useState(null)
  const [phoneProof, setPhoneProof] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef(null)
  const shakeTimerRef = useRef(null)

  const usernameAbortRef = useRef(null)
  const emailAbortRef    = useRef(null)
  const phoneAbortRef    = useRef(null)

  // Reset OTP state whenever the phone number changes after it was already sent/verified
  const prevPhoneRef = useRef('')
  useEffect(() => {
    const phone = form.phoneNumber
    if (phone !== prevPhoneRef.current) {
      prevPhoneRef.current = phone
      if (otpState !== 'idle') {
        setOtpState('idle')
        setOtpError(null)
        setPhoneProof(null)
        setCountdown(0)
        clearInterval(countdownRef.current)
        clearTimeout(shakeTimerRef.current)
      }
    }
  }, [form.phoneNumber, otpState])

  function startCountdown() {
    setCountdown(RESEND_SECONDS)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => {
    clearInterval(countdownRef.current)
    clearTimeout(shakeTimerRef.current)
  }, [])

  async function sendCode() {
    setOtpState('sending')
    setOtpError(null)
    try {
      await sendPhoneOtp(form.phoneNumber.trim())
      setOtpState('sent')
      startCountdown()
    } catch {
      setOtpState('sent')
      setOtpError('Could not send code. Check the number and try again.')
    }
  }

  async function resendCode() {
    setOtpError(null)
    try {
      await sendPhoneOtp(form.phoneNumber.trim())
      startCountdown()
    } catch {
      setOtpError('Could not resend code. Please try again.')
    }
  }

  async function submitOtp(code) {
    setOtpState('verifying')
    setOtpError(null)
    try {
      const { data } = await verifyPhoneOtp(form.phoneNumber.trim(), code)
      setPhoneProof(data.token)
      setOtpState('verified')
      clearInterval(countdownRef.current)
    } catch (err) {
      const msg = parseApiError(err, 'Incorrect or expired code. Please try again.')
      setOtpError(msg)
      setOtpState('error')
      // allow retry from the 'sent' state after brief shake
      clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = setTimeout(() => setOtpState('sent'), 600)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'username' || name === 'email' || name === 'phoneNumber') {
      setAvailability(prev => ({ ...prev, [name]: 'idle' }))
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
    else if (otpState !== 'verified') e.phoneNumber = 'Please verify your phone number first.'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  function handleStep1(e) {
    e.preventDefault()
    setError(null)
    if (!validateStep1()) return
    if (
      availability.username    === 'checking' ||
      availability.email       === 'checking' ||
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
      phoneVerificationProof: phoneProof,
    }
    if (form.role === 'Player') {
      if (form.skillLevel) payload.skillLevel = form.skillLevel
      if (form.preferredPosition) payload.preferredPosition = form.preferredPosition
    }

    try {
      await api.post('/api/auth/register', payload)
      setForm(prev => ({ ...prev, password: '' }))
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
      } else if (lower.includes('phone') && !lower.includes('verification')) {
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

  const phoneIsValidAndAvailable =
    PHONE_RE.test(form.phoneNumber.trim()) && availability.phoneNumber === 'available'

  return {
    form,
    step,
    error,
    fieldErrors,
    availability,
    isSubmitting,
    otpState,
    otpError,
    countdown,
    phoneIsValidAndAvailable,
    handleChange,
    setField,
    sendCode,
    resendCode,
    submitOtp,
    handleStep1,
    handleSubmit,
    back,
  }
}
