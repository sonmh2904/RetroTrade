"use client"

import { motion, Variants } from "framer-motion"
import Link from "next/link"

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
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17,
    },
  },
};

export function CTASection() {
  return (
    <section className="relative z-10 py-24 px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      {/* Floating shapes */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/20 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto relative text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
          className="text-5xl md:text-6xl font-bold mb-6 text-white leading-tight"
        >
          Sẵn sàng bắt đầu hành trình
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
            bền vững của bạn?
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
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
          <motion.div variants={buttonVariants} whileHover="hover">
            <Link href="/products">
              <button className="px-10 py-5 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden">
                <span className="relative z-10">Khám phá sản phẩm</span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-purple-100 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </Link>
          </motion.div>

          <motion.div variants={buttonVariants} whileHover="hover">
            <Link href="/auth/register">
              <button className="px-10 py-5 border-2 border-white text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                Đăng ký ngay
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}