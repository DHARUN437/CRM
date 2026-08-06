"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function AuthBackground() {
  const [mounted, setMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [stars, setStars] = useState<any[]>([])
  const [particles, setParticles] = useState<any[]>([])

  useEffect(() => {
    // Generate random values safely in effect
    const newStars = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 3 + 2,
    }))
    
    const newParticles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      animY: Math.random() * -600 - 200,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * 10,
    }))

    setStars(newStars)
    setParticles(newParticles)
    setMounted(true)

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#03040B] pointer-events-none">
      {/* Base Deep Navy Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#0F172A_0%,#03040B_100%)] opacity-80" />

      {/* Dynamic Purple/Blue Aurora Gradients */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, -50, 0],
          y: [0, -50, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-40 -left-40 size-[800px] rounded-full bg-[#7C6DFF]/10 blur-[150px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          x: [0, -100, 50, 0],
          y: [0, 100, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[30%] right-[-10%] size-[600px] rounded-full bg-blue-600/10 blur-[120px]"
      />
      
      {/* Tiny Stars Field */}
      <div className="absolute inset-0">
        {stars.map((star, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 2, star.opacity],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated Particle Network */}
      <div className="absolute inset-0">
        {particles.map((particle, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-[#7C6DFF]/30 blur-[1px]"
            initial={{
              x: particle.x,
              y: particle.y,
              width: particle.size,
              height: particle.size,
              opacity: 0,
            }}
            animate={{
              y: [particle.y, particle.y + particle.animY],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Moving Glass Reflections */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.01)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_15s_infinite_linear] pointer-events-none" />

      {/* Mouse Interactive Spotlight */}
      <motion.div
        className="absolute inset-0 z-10 mix-blend-screen"
        animate={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(124, 109, 255, 0.05), transparent 40%)`,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0 }}
      />
    </div>
  )
}
