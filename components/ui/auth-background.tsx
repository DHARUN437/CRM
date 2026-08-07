"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  duration: number
}

interface Particle {
  x: number
  y: number
  animY: number
  size: number
  duration: number
  delay: number
}

function generateStars(): Star[] {
  const width = typeof window !== "undefined" ? window.innerWidth : 0
  const height = typeof window !== "undefined" ? window.innerHeight : 0
  return Array.from({ length: 40 }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.3 + 0.05,
    duration: Math.random() * 3 + 2,
  }))
}

function generateParticles(): Particle[] {
  const width = typeof window !== "undefined" ? window.innerWidth : 0
  const height = typeof window !== "undefined" ? window.innerHeight : 0
  return Array.from({ length: 24 }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    animY: Math.random() * -600 - 200,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 15,
    delay: Math.random() * 10,
  }))
}

export function AuthBackground() {
  const [mounted, setMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [stars] = useState<Star[]>(generateStars)
  const [particles] = useState<Particle[]>(generateParticles)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[var(--background)] pointer-events-none">
      {/* Base Soft Light Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#FFFFFF_0%,#EFF4FC_100%)] opacity-80" />

      {/* Soft Blue Aurora Gradients */}
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
        className="absolute -top-40 -left-40 size-[800px] rounded-full bg-[var(--accent)]/8 blur-[150px]"
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
        className="absolute top-[30%] right-[-10%] size-[600px] rounded-full bg-[#4B9DFF]/8 blur-[120px]"
      />

      {/* Subtle Floating Dots */}
      <div className="absolute inset-0">
        {stars.map((star, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full bg-[var(--accent)]"
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
            className="absolute rounded-full bg-[var(--accent)]/20 blur-[1px]"
            initial={{
              x: particle.x,
              y: particle.y,
              width: particle.size,
              height: particle.size,
              opacity: 0,
            }}
            animate={{
              y: [particle.y, particle.y + particle.animY],
              opacity: [0, 0.5, 0],
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
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_15s_infinite_linear] pointer-events-none" />

      {/* Mouse Interactive Spotlight */}
      <motion.div
        className="absolute inset-0 z-10 mix-blend-multiply"
        animate={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(47, 111, 237, 0.05), transparent 40%)`,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0 }}
      />
    </div>
  )
}
