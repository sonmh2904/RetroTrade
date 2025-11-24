"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

interface Stat {
  number: string
  label: string
  icon: string
  gradient: string
  hasK?: boolean
}

const stats: Stat[] = [
  {
    number: "50+",
    label: "Danh mục sản phẩm",
    icon: "📂",
    gradient: "from-blue-500 to-cyan-500",
    hasK: true,
  },
  {
    number: "34",
    label: "Tỉnh thành phủ sóng",
    icon: "🗺️",
    gradient: "from-purple-500 to-pink-500",
    hasK: false,
  },
  {
    number: "98%",
    label: "Tỷ lệ hài lòng",
    icon: "⭐",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    number: "24/7",
    label: "Hỗ trợ khách hàng",
    icon: "💬",
    gradient: "from-green-500 to-emerald-500",
  },
]

export function AboutStats() {
  const sectionRef = useRef<HTMLElement>(null)
  const [animatedStats, setAnimatedStats] = useState<number[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate stats when section comes into view
            stats.forEach((stat, index) => {
              if (!stat.number.includes("%") && !stat.number.includes("/")) {
                setTimeout(() => {
                  const numericValue = parseInt(stat.number.replace(/[^\d]/g, ""))
                  if (numericValue) {
                    animateNumber(numericValue, index)
                  }
                }, index * 200)
              }
            })
          }
        })
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const animateNumber = (target: number, index: number) => {
    let current = 0
    const increment = target / 50
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      setAnimatedStats((prev) => {
        const newStats = [...prev]
        newStats[index] = Math.floor(current)
        return newStats
      })
    }, 20)
  }

  const getDisplayNumber = (stat: Stat, index: number) => {
    if (stat.number.includes("%") || stat.number.includes("/")) {
      return stat.number
    }
    const animated = animatedStats[index] || 0
    return stat.hasK ? `${animated}+` : animated.toString()
  }

  return (
    <section ref={sectionRef} className="relative z-10 py-32 px-4 overflow-hidden">
      {/* Enhanced animated background with gradient shift and floating shapes */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
        {/* Animated gradient overlay for subtle color shift */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ 
            x: [0, 100, 0],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        {/* Floating geometric shapes for dynamic movement */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 border-2 border-white/30 rounded-full bg-white/10 backdrop-blur-sm"
          animate={{ 
            rotate: [0, 360],
            y: [-20, 20, -20],
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-24 h-24 border-2 border-white/30 rounded-full bg-white/10 backdrop-blur-sm"
          animate={{ 
            rotate: [360, 0],
            y: [20, -20, 20],
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 5 
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-white/30 rounded-full bg-white/10 backdrop-blur-sm"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        {/* Enhanced floating particles with varied motion */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -15, 0],
              x: [-5, 5, -5],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 5 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Subtle wave-like lines for depth */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0,transparent_50%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-wave" style={{ backgroundSize: "200% 100%" }} />
        </div>
      </div>

      <div className="container mx-auto relative z-10">
        <motion.div
          className="text-center text-white mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-5xl md:text-6xl font-bold mb-6"
            initial={{ scale: 0.95 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            RetroTrade qua{" "}
            <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              những con số
            </span>
          </motion.h2>
          <motion.p
            className="text-xl text-indigo-100 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Những con số ấn tượng phản ánh sự tin tưởng và phát triển của cộng đồng
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center group"
              variants={{
                hidden: { opacity: 0, y: 50 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative mb-6">
                <motion.div
                  className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-3xl">{stat.icon}</span>
                </motion.div>
                <motion.div
                  className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <div className="space-y-2">
                <motion.div
                  className="text-4xl md:text-5xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-yellow-300 group-hover:to-orange-300 transition-all duration-300"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {getDisplayNumber(stat, index)}
                </motion.div>
                <div className="text-indigo-100 font-medium">{stat.label}</div>
              </div>

              <motion.div
                className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${stat.gradient} transition-all duration-500 mx-auto rounded-full mt-4`}
                initial={{ width: 0 }}
                whileHover={{ width: "100%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Additional info with enhanced animation */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <span className="text-yellow-300">🏆</span>
            <span className="text-white font-medium">Được tin tưởng bởi hàng nghìn người dùng</span>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-wave {
          animation: wave 8s linear infinite;
        }
      `}</style>
    </section>
  )
}