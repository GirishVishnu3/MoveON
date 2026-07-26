import React, { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export function SplashScreen({ onComplete, durationMs = 3000 }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  const letterContainerVariant: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.5,
      }
    }
  };

  const letterVariant: Variants = {
    hidden: { y: 30, opacity: 0, scale: 0.8 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', damping: 14, stiffness: 250 }
    }
  };

  const dotVariant: Variants = {
    hidden: { y: 0, scale: 1 },
    visible: (i: number) => ({
      y: [-5, 5, -5],
      scale: [1, 1.2, 1],
      transition: {
        repeat: Infinity,
        duration: 1.4,
        delay: i * 0.18,
        ease: 'easeInOut'
      }
    })
  };

  // Small decorative particles
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i / 8) * 360,
    delay: i * 0.1,
    size: i % 3 === 0 ? 4 : 2.5,
    distance: 110 + (i % 3) * 20,
  }));

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#080d17] z-50 overflow-hidden">

      {/* Deep background nebula glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full blur-[130px]"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(59,130,246,0.12) 50%, transparent 80%)',
        }}
      />

      {/* Rotating outer halo ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute w-72 h-72 rounded-full border border-emerald-500/10"
        style={{ borderStyle: 'dashed' }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        className="absolute w-56 h-56 rounded-full border border-blue-500/10"
        style={{ borderStyle: 'dashed' }}
      />

      {/* Orbiting particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ delay: 0.8 + p.delay, duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
          className="absolute rounded-full bg-emerald-400"
          style={{
            width: p.size,
            height: p.size,
            top: `calc(50% + ${Math.sin((p.angle * Math.PI) / 180) * p.distance}px)`,
            left: `calc(50% + ${Math.cos((p.angle * Math.PI) / 180) * p.distance}px)`,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center z-10"
      >
        {/* Logo Container */}
        <motion.div
          initial={{ rotate: -15, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 1.1, type: 'spring', stiffness: 180, damping: 16 }}
          className="relative w-36 h-36 mb-10 flex items-center justify-center"
        >
          {/* Spinning gradient ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-[2.2rem]"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.3) 0%, transparent 50%, rgba(59,130,246,0.2) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-[1.8rem]"
            style={{ border: '1px solid rgba(59,130,246,0.15)' }}
          />

          {/* Core icon card */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 14 }}
            className="relative w-20 h-20 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #059669, #0891b2)',
              boxShadow: '0 0 40px rgba(16,185,129,0.35), 0 0 80px rgba(16,185,129,0.1)',
            }}
          >
            {/* Shimmer sweep */}
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
              className="absolute inset-y-0 w-1/2 -skew-x-12"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
            />
            {/* MoveON car/location icon */}
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Brand Name with staggered letter pop */}
        <motion.div
          variants={letterContainerVariant}
          initial="hidden"
          animate="visible"
          className="flex text-[3.5rem] font-black tracking-tighter mb-3 leading-none"
        >
          {['M', 'o', 'v', 'e'].map((letter, i) => (
            <motion.span
              key={`white-${i}`}
              variants={letterVariant}
              className="text-white"
              style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}
            >
              {letter}
            </motion.span>
          ))}
          {['O', 'N'].map((letter, i) => (
            <motion.span
              key={`green-${i}`}
              variants={letterVariant}
              style={{
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-gray-500 text-xs font-semibold uppercase tracking-[0.25em] mb-12"
        >
          Your ride, your way
        </motion.p>

        {/* Loading dots */}
        <div className="flex gap-2.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              custom={i}
              variants={dotVariant}
              initial="hidden"
              animate="visible"
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                boxShadow: '0 0 12px rgba(16,185,129,0.6)',
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom fade vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #080d17, transparent)' }}
      />
    </div>
  );
}
