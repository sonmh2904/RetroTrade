"use client"

import { motion, Variants } from "framer-motion"
import Link from "next/link"
import { SparklesIcon, ShoppingBagIcon, BookOpenIcon } from "@heroicons/react/24/outline"

const ctaVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const buttonVariants: Variants = {
  hover: {
    scale: 1.05,
    y: -2,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17,
    },
  },
};

const floatingVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 360,
    transition: {
      duration: 20,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

const sparkleVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      delay: Math.random() * 2,
    },
  },
};

export function CTASection() {
  return (
    <section className="relative z-10 py-24 px-4 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 overflow-hidden animate-gradient-xy"> {/* Thêm animation cho gradient */}
      {/* Animated gradient background */}
      <style jsx>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 15s ease infinite;
        }
      `}</style>

      {/* Background elements */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: '60px 60px',
            animation: 'gradient-xy 20s ease infinite', // Animate pattern
          }}
        />
      </div>

      {/* Enhanced floating shapes với animation */}
      <motion.div 
        className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" 
        variants={floatingVariants}
        initial="hidden"
        animate="visible"
        style={{ animationDelay: '0s' }}
      />
      <motion.div 
        className="absolute bottom-20 right-20 w-40 h-40 bg-yellow-300/20 rounded-full blur-xl" 
        variants={floatingVariants}
        initial="hidden"
        animate="visible"
        style={{ animationDelay: '2s' }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-300/30 rounded-full blur-lg" 
        animate={{ 
          y: [-20, 20, -20], 
          rotate: [0, 180, 360] 
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        style={{ animationDelay: '1s' }}
      />

      {/* Sparkles cho hiệu ứng lấp lánh */}
      <motion.div 
        className="absolute top-10 right-10"
        variants={sparkleVariants}
        initial="hidden"
        animate="visible"
      >
        <SparklesIcon className="w-8 h-8 text-yellow-300" />
      </motion.div>
      <motion.div 
        className="absolute bottom-10 left-10"
        variants={sparkleVariants}
        initial="hidden"
        animate="visible"
      >
        <SparklesIcon className="w-6 h-6 text-orange-300" />
      </motion.div>

      <div className="container mx-auto relative text-center">
        {/* Tiêu đề với stagger animation cho từng dòng */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <motion.h2 
            className="text-5xl md:text-6xl font-bold text-white leading-tight"
            initial="hidden"
            whileInView="visible"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: (i = 0) => ({
                opacity: 1,
                y: 0,
                transition: { delay: i * 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }
              })
            }}
            custom={0}
          >
            Sẵn sàng bắt đầu hành trình
          </motion.h2>
          <motion.span 
            className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 block" // Gradient sống động hơn
            initial="hidden"
            whileInView="visible"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0, transition: { delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
            }}
            custom={1}
          >
            bền vững của bạn?
          </motion.span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl text-indigo-100 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Tham gia ngay hôm nay để tiết kiệm chi phí, bảo vệ môi trường và kết nối với cộng đồng yêu thích sự bền vững.
        </motion.p>

        <motion.div 
          variants={ctaVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          {/* Nút chính với shimmer effect và icon ShoppingBag */}
          <motion.div variants={buttonVariants} whileHover="hover">
            <Link href="/products">
              <button className="group relative px-10 py-5 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Khám phá sản phẩm
                  <ShoppingBagIcon className="w-5 h-5" />
                </span>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </Link>
          </motion.div>

          {/* Nút thứ hai với glow effect và icon BookOpen */}
          <motion.div variants={buttonVariants} whileHover="hover">
            <Link href="/blog">
              <button className="relative px-10 py-5 border-2 border-white/80 text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm overflow-hidden group">
                <span className="relative z-10 flex items-center gap-2">
                  Khám phá blog
                  <BookOpenIcon className="w-5 h-5" />
                </span>
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/30 to-pink-400/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100" />
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-2xl blur opacity-75 animate-pulse" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}