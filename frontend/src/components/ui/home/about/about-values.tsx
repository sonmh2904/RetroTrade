"use client"

import { useEffect, useRef } from "react"
import { motion, Variants } from "framer-motion"
import { Card, CardContent } from "@/components/ui/common/card"
import { cn } from "@/lib/utils"

const values = [
  {
    icon: "🌱",
    title: "Bền vững",
    description: "Cam kết bảo vệ môi trường và tạo ra tương lai xanh cho thế hệ sau",
    gradient: "from-green-400 to-emerald-600",
  },
  {
    icon: "🤝",
    title: "Cộng đồng",
    description: "Xây dựng mạng lưới kết nối và chia sẻ giữa mọi người",
    gradient: "from-blue-400 to-indigo-600",
  },
  {
    icon: "💡",
    title: "Sáng tạo",
    description: "Khuyến khích tư duy mới và cách tiếp cận độc đáo",
    gradient: "from-yellow-400 to-orange-600",
  },
  {
    icon: "🔒",
    title: "Tin cậy",
    description: "Đảm bảo an toàn và minh bạch trong mọi giao dịch",
    gradient: "from-purple-400 to-pink-600",
  },
  {
    icon: "⚡",
    title: "Hiệu quả",
    description: "Tối ưu hóa quy trình để mang lại trải nghiệm tốt nhất",
    gradient: "from-cyan-400 to-blue-600",
  },
  {
    icon: "❤️",
    title: "Tận tâm",
    description: "Luôn lắng nghe và phục vụ khách hàng với trái tim",
    gradient: "from-red-400 to-rose-600",
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
      delay: i * 0.1,
    },
  }),
  hover: {
    y: -8,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  },
}

export function AboutValues() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up")
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

  return (
    <section ref={sectionRef} className="relative z-10 py-20 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6">
            Giá trị cốt lõi
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Những nguyên tắc và giá trị định hướng mọi hoạt động của chúng tôi
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
        >
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              variants={itemVariants}
              custom={index}
              whileHover="hover"
              className="h-full"
            >
              <Card className="group h-full bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300",
                  value.gradient
                )} />
                <CardContent className="p-8 h-full flex flex-col">
                  <div className={cn(
                    "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6",
                    "bg-gradient-to-br text-white text-4xl transition-transform duration-300",
                    "group-hover:scale-110",
                    value.gradient
                  )}>
                    {value.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 text-lg leading-relaxed flex-grow">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}