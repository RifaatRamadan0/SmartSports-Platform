import { motion, useReducedMotion } from 'framer-motion'
import { pageVariants } from '../../lib/motion'

export default function PageWrapper({ children, className, ...props }) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className} {...props}>{children}</div>
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
