"use client"

import { motion, Variants } from "framer-motion"
import { Shield, Zap, Clock, Users, Leaf, Award, CheckCircle } from "lucide-react"
import { useState } from "react"

const reasons = [
  {
    title: "An toàn & Bảo mật",
    description: "Giao dịch được bảo vệ với công nghệ mã hóa tiên tiến, đảm bảo thông tin cá nhân của bạn luôn an toàn.",
    icon: <Shield className="w-8 h-8" />,
    color: "from-indigo-500 to-purple-600",
    features: ["Xác thực 2 lớp", "Mã hóa dữ liệu", "Bảo vệ giao dịch"]
  },
  {
    title: "Tiết kiệm tối đa",
    description: "Giải pháp tiết kiệm chi phí hiệu quả so với mua mới, giúp bạn tối ưu ngân sách tài chính.",
    icon: <Zap className="w-8 h-8" />,
    color: "from-emerald-500 to-teal-600",
    features: ["Giá cả hợp lý", "Ưu đãi đặc biệt", "Tiết kiệm lâu dài"]
  },
  {
    title: "Hỗ trợ tận tâm",
    description: "Đội ngũ hỗ trợ chuyên nghiệp luôn sẵn sàng đồng hành và giải đáp mọi thắc mắc của bạn.",
    icon: <Clock className="w-8 h-8" />,
    color: "from-amber-500 to-orange-600",
    features: ["Hỗ trợ đa kênh", "Phản hồi nhanh chóng", "Giải pháp tối ưu"]
  }
]

const stats = [
  { 
    value: "Gắn kết", 
    label: "Cộng đồng yêu môi trường", 
    icon: <Users className="w-6 h-6" /> 
  },
  { 
    value: "Hài lòng", 
    label: "Trải nghiệm thuê và chia sẻ", 
    icon: <CheckCircle className="w-6 h-6" /> 
  },
  { 
    value: "Đa dạng", 
    label: "Đồ dùng và giao dịch", 
    icon: <Award className="w-6 h-6" /> 
  },
  { 
    value: "Bền vững", 
    label: "Giải pháp thân thiện môi trường", 
    icon: <Leaf className="w-6 h-6" /> 
  }
];


const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + (i * 0.1),
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1]
    }
  }),
  hover: {
    y: -5,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
      when: "beforeChildren"
    }
  }
}

const scaleIn: Variants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + (i * 0.1),
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1]
    }
  }),
  hover: {
    scale: 1.02,
    y: -5,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
      scale: {
        type: 'spring',
        damping: 15,
        stiffness: 300
      }
    }
  }
}

export function WhyUsSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section 
      className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-indigo-50"
      id="tai-sao"
    >
      {/* Animated background elements */}
      <motion.div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ duration: 1 }}
      />

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 mb-6 px-6 py-3 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold shadow-lg"
            variants={fadeInUp}
            custom={0}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            TẠI SAO CHỌN CHÚNG TÔI?
          </motion.div>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            variants={fadeInUp}
            custom={1}
          >
            Giải pháp <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              thông minh
            </span> cho mọi nhu cầu
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 max-w-3xl mx-auto"
            variants={fadeInUp}
            custom={2}
          >
            Trải nghiệm sự khác biệt với các giải pháp thông minh và dịch vụ chuyên nghiệp của chúng tôi
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              custom={index}
              className="bg-white p-6 rounded-2xl shadow-lg text-center"
            >
              <motion.div 
                className="w-14 h-14 mx-auto mb-3 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-md"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 15,
                    delay: 0.2 + (index * 0.1)
                  }
                }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  transition: { 
                    type: 'spring',
                    stiffness: 400,
                    damping: 15
                  }
                }}
              >
                {stat.icon}
              </motion.div>
              <motion.p 
                className="text-3xl font-bold text-gray-900 mb-1 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    delay: 0.3 + (index * 0.1),
                    duration: 0.5
                  }
                }}
                viewport={{ once: true }}
              >
                {stat.value}
              </motion.p>
              <motion.p 
                className="text-gray-600 text-sm font-medium"
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    delay: 0.4 + (index * 0.1),
                    duration: 0.5
                  }
                }}
                viewport={{ once: true }}
              >
                {stat.label}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>

        {/* Reasons Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
              className={`relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${
                activeIndex === index 
                  ? 'border-indigo-500' 
                  : 'border-transparent hover:border-indigo-100'
              }`}
            >
              {/* Animated background on hover */}
              <motion.div 
                className={`absolute inset-0 bg-gradient-to-br ${reason.color} opacity-0`}
                animate={{ 
                  opacity: activeIndex === index ? 0.05 : 0,
                  transition: { duration: 0.3 }
                }}
              />
              
              <motion.div 
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${reason.color} flex items-center justify-center text-white mb-6 mx-auto transition-all duration-300 shadow-lg`}
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ 
                  scale: 1, 
                  rotate: 0,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                    delay: 0.1 + (index * 0.1)
                  }
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -3, 3, 0],
                  transition: { 
                    rotate: {
                      repeat: 1,
                      duration: 0.4,
                      ease: 'easeInOut'
                    },
                    scale: {
                      type: 'spring',
                      stiffness: 400,
                      damping: 15
                    }
                  }
                }}
              >
                <motion.div
                  animate={activeIndex === index ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  } : {}}
                  transition={{
                    duration: 0.4,
                    ease: 'easeInOut',
                    times: [0, 0.3, 0.6, 1],
                  }}
                >
                  {reason.icon}
                </motion.div>
              </motion.div>
              
              <motion.h3 
                className="text-2xl font-bold text-gray-900 mb-3 text-center"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    delay: 0.2 + (index * 0.1),
                    duration: 0.5
                  }
                }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
              >
                {reason.title}
              </motion.h3>
              
              <motion.p 
                className="text-gray-600 leading-relaxed mb-6 text-center"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    delay: 0.3 + (index * 0.1),
                    duration: 0.5
                  }
                }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
              >
                {reason.description}
              </motion.p>
              
              <div className="space-y-3 mt-6">
                {reason.features.map((feature, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-center gap-2 text-gray-700 bg-gray-50/50 rounded-lg p-3 -mx-2"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ 
                      opacity: 1, 
                      x: 0,
                      transition: {
                        delay: 0.4 + (i * 0.05),
                        duration: 0.4,
                        ease: "easeOut"
                      }
                    }}
                    viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                    whileHover={{
                      x: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      transition: { duration: 0.2 }
                    }}
                  >
                    <motion.span 
                      className="inline-block"
                      whileHover={{
                        scale: 1.1,
                        transition: { 
                          type: 'spring',
                          stiffness: 400,
                          damping: 15
                        }
                      }}
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    </motion.span>
                    <span className="text-sm font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>
              
              <motion.div 
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ 
                  width: "100%",
                  opacity: 1,
                  transition: { 
                    width: { 
                      delay: 0.4 + (index * 0.1), 
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1]
                    },
                    opacity: { duration: 0.3 }
                  }
                }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                whileHover={{
                  scaleX: [1, 1.05, 1],
                  transition: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }
                }}
              />
            </motion.div>
          ))}
        </motion.div>

      </div>

      {/* Animated floating elements */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full -z-10 ${
            i % 2 === 0 
              ? 'bg-indigo-200/30' 
              : 'bg-purple-200/30'
          }`}
          style={{
            width: `${50 + (i * 20)}px`,
            height: `${50 + (i * 20)}px`,
            top: `${10 + (i * 20)}%`,
            left: `${10 + (i * 20)}%`,
            opacity: 0.4 - (i * 0.1)
          }}
          animate={{
            y: [0, -20 + (i * 10), 0],
            x: [0, 10 - (i * 3), 0],
            scale: [1, 1.05, 1],
            rotate: [0, 90]
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'reverse',
            delay: i * 0.3
          }}
        />
      ))}
      
      {/* Floating shapes */}
      {['triangle', 'circle', 'square'].map((shape, i) => {
        const size = 30 + (i * 15);
        return (
          <motion.div
            key={shape}
            className={`absolute -z-10 ${
              i === 0 ? 'bg-gradient-to-br from-indigo-400/20 to-purple-400/20' :
              i === 1 ? 'bg-gradient-to-br from-pink-400/20 to-rose-400/20' :
              'bg-gradient-to-br from-blue-400/20 to-cyan-400/20'
            }`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              bottom: `${20 + (i * 15)}%`,
              right: `${10 + (i * 15)}%`,
              clipPath: 
                shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
                shape === 'circle' ? 'circle(50%)' : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
            }}
            animate={{
              y: [0, -15 + (i * 5), 0],
              x: [0, 5 - (i * 2), 0],
              rotate: [0, 90],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 12 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatType: 'reverse',
              delay: i * 0.4
            }}
          />
        );
      })}
    </section>
  )
}