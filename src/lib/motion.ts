/**
 * VANESEV - Motion System Presets (framer-motion)
 * Conforme a docs/DISENO_AUTOR_VANESEV.md §6 y §9
 * 100% acelerado por GPU y soporte estricto de prefers-reduced-motion
 */

export const motionTransitions = {
  smooth: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  gentle: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  spring: { type: 'spring', damping: 25, stiffness: 200 },
  micro: { duration: 0.18, ease: 'easeOut' },
};

/**
 * Variantes de Fade In con desplazamiento sutil (o solo opacidad si hay reducción de movimiento)
 */
export const fadeInVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: motionTransitions.smooth,
  },
};

export const fadeInReducedVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

/**
 * Contenedor con stagger de hijos
 */
export const staggerContainerVariants = (staggerChildren = 0.08, delayChildren = 0.05) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: motionTransitions.smooth,
  },
};

export const staggerItemReducedVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
};

/**
 * Variantes para Diálogos y Modales
 */
export const modalScaleVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: motionTransitions.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: motionTransitions.micro,
  },
};

export const modalScaleReducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/**
 * Variantes para fondos/overlays
 */
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Microinteracciones en botones y CTAs
 */
export const ctaHoverVariants = {
  y: -2,
  transition: motionTransitions.micro,
};

export const ctaTapVariants = {
  scale: 0.98,
  transition: motionTransitions.micro,
};

/**
 * Helper seguro para consultar prefers-reduced-motion en cliente
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}
