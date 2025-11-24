"use client"

import { motion, Variants, AnimatePresence } from "framer-motion"
import { ShoppingBag, Leaf, Users, ShieldCheck, Clock, Heart, ArrowRight } from "lucide-react"
import { useState } from "react"

const features = [
  {
    title: "Tiết kiệm chi phí",
    description: "Thuê đồ với giá chỉ bằng 30% so với mua mới, giúp bạn tiết kiệm đáng kể ngân sách cho các sự kiện và nhu cầu sử dụng ngắn hạn.",
    icon: <ShoppingBag className="w-8 h-8" />,
    color: "from-orange-500 to-amber-500"
  },
  {
    title: "Bảo vệ môi trường",
    description: "Góp phần giảm thiểu rác thải và bảo vệ tài nguyên thiên nhiên thông qua việc tái sử dụng đồ dùng một cách thông minh.",
    icon: <Leaf className="w-8 h-8" />,
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "Đa dạng lựa chọn",
    description: "Kho đồ đa dạng, phong phú với nhiều phong cách khác nhau, đáp ứng mọi nhu cầu và sở thích của bạn.",
    icon: <Users className="w-8 h-8" />,
    color: "from-blue-500 to-indigo-500"
  }
]

const benefits = [
  {
    title: "Chất lượng đảm bảo",
    description: "Tất cả sản phẩm đều được kiểm tra kỹ lưỡng trước khi cho thuê.",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-amber-600"
  },
  {
    title: "Tiết kiệm thời gian",
    description: "Đặt hàng nhanh chóng, giao nhận tận nơi, tiện lợi.",
    icon: <Clock className="w-6 h-6" />,
    color: "text-blue-600"
  },
  {
    title: "Hỗ trợ 24/7",
    description: "Đội ngũ chăm sóc khách hàng luôn sẵn sàng hỗ trợ bạn.",
    icon: <Heart className="w-6 h-6" />,
    color: "text-rose-600"
  }
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  }
}

const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  hover: {
    y: -5,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
}

const benefitItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  })
}

export function FeaturesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="relative py-20 px-4 bg-white overflow-hidden">
      {/* Animated background elements */}
      <motion.div 
        className="absolute inset-0 bg-[url('/patterns/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 0.03,
          transition: { duration: 1 }
        }}
      />
      
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ 
            opacity: 1, 
            y: 0,
            transition: { 
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1]
            }
          }}
          viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
          <motion.span 
            className="inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-4"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ 
              scale: 1, 
              opacity: 1,
              transition: { 
                delay: 0.2,
                duration: 0.6
              }
            }}
            viewport={{ once: true }}
          >
            TẠI SAO CHỌN CHÚNG TÔI?
          </motion.span>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ 
              y: 0, 
              opacity: 1,
              transition: { 
                delay: 0.3,
                duration: 0.8
              }
            }}
            viewport={{ once: true }}
          >
            Giải pháp <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
              thông minh
            </span> cho cuộc sống hiện đại
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 max-w-3xl mx-auto"
            initial={{ y: 10, opacity: 0 }}
            whileInView={{ 
              y: 0, 
              opacity: 1,
              transition: { 
                delay: 0.4,
                duration: 0.8
              }
            }}
            viewport={{ once: true }}
          >
            RetroTrade mang đến những trải nghiệm thuê đồ tiện lợi, tiết kiệm và thân thiện với môi trường
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover="hover"
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
            >
              {/* Animated background on hover */}
              <motion.div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5`}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: hoveredIndex === index ? 0.05 : 0,
                  transition: { duration: 0.3 }
                }}
              />
              
              <motion.div 
                className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 transition-all duration-300 group-hover:scale-110`}
                whileHover={{ 
                  rotate: 5,
                  transition: { type: "spring", stiffness: 300 }
                }}
              >
                {feature.icon}
              </motion.div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3 relative">
                {feature.title}
                <motion.span 
                  className="absolute left-0 -bottom-1 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500"
                  initial={{ width: 0 }}
                  whileInView={{ 
                    width: "100%",
                    transition: { delay: 0.5 + (index * 0.1), duration: 0.8 }
                  }}
                  viewport={{ once: true }}
                />
              </h3>
              
              <p className="text-gray-600 leading-relaxed mb-6">{feature.description}</p>
              
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}