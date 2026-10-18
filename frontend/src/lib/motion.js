import { useReducedMotion } from 'framer-motion'

export function useMotionSafe() {
  const reduced = useReducedMotion()
  return reduced ? () => ({}) : (variants) => variants
}

export const tweenTransition = { type: 'tween', ease: 'easeOut', duration: 0.25 }
export const springTransition = { type: 'spring', stiffness: 260, damping: 20 }

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: tweenTransition },
  exit:    { opacity: 0, y: -16, transition: tweenTransition },
}

export const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springTransition },
}

export const cardHover = { y: -5, scale: 1.02 }
export const cardTap   = { scale: 0.97 }

export const buttonHover = { scale: 1.04 }
export const buttonTap   = { scale: 0.95 }

export const listContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const listItemVariants = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: springTransition },
}

export const stepVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: tweenTransition },
  exit:    { opacity: 0, x: -40, transition: tweenTransition },
}

export const confirmCardVariants = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { ...springTransition, delay: 0.6 } },
}
