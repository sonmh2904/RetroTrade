"use client"

import { motion, Variants, useInView } from "framer-motion"
import Image from "next/image"
import { useRef, useState } from "react"

const testimonials = [
  {
  name: "Đinh Đức Linh",
  role: "Người cho thuê",
  content:
    "Tôi đã đăng cho thuê nhiều món đồ trên RetroTrade và rất bất ngờ vì lượng khách tìm đến. Nền tảng giúp tôi tận dụng lại những đồ ít dùng, vừa có thêm thu nhập vừa giảm lãng phí. Quy trình duyệt, giao nhận và thanh toán đều minh bạch, hỗ trợ khách hàng cực kỳ nhanh. Rất đáng trải nghiệm!",
  avatar: "/avatar_user/linhdd.jpg",
  rating: 5,
},
{
  name: "Đỗ Xuân Duy",
  role: "Khách hàng",
  content:
    "Tôi thường xuyên thuê thiết bị quay chụp cho công việc và RetroTrade là lựa chọn số một. Giao diện dễ dùng, tìm kiếm nhanh, giá thuê hợp lý và có bảo đảm an toàn nên hoàn toàn yên tâm. Quá trình đặt thuê và trả đồ diễn ra trơn tru chỉ trong vài phút, rất tiện lợi!",
  avatar: "/avatar_user/duydx.jpg",
  rating: 5,
},
{
  name: "Lưu Minh Đức",
  role: "Người cho thuê",
  content:
    "RetroTrade giúp tôi kết nối với nhiều khách hàng mà trước đây không thể tiếp cận. Các sản phẩm được kiểm duyệt rõ ràng, phản hồi từ khách cũng minh bạch nên tạo cảm giác rất chuyên nghiệp. Từ khi sử dụng nền tảng, hiệu suất cho thuê của tôi tăng lên đáng kể. Hoàn toàn hài lòng!",
  avatar: "/avatar_user/duclm.jpg",
  rating: 5,
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
  },
};

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

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="relative z-10 py-24 px-4 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-indigo-50" id="danh-gia">
      {/* Animated background elements */}
      <motion.div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ duration: 1 }}
      />
      
      {/* Floating elements */}
      <div className="absolute top-1/4 left-5 w-20 h-20 bg-indigo-200/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-1/3 right-10 w-16 h-16 bg-purple-200/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-2/3 left-1/2 w-12 h-12 bg-yellow-200/30 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s' }} />

      <div ref={ref} className="container mx-auto relative z-10">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-indigo-600">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            ĐÁNH GIÁ TỪ KHÁCH HÀNG
          </motion.div>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            variants={fadeInUp}
            custom={1}
          >
            Khách hàng <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              nói gì
            </span> về chúng tôi?
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 max-w-3xl mx-auto"
            variants={fadeInUp}
            custom={2}
          >
            Những chia sẻ chân thành từ cộng đồng, truyền cảm hứng cho hành trình bền vững của chúng ta
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              whileHover="hover"
              className={`relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${
                activeIndex === index 
                  ? 'border-indigo-500' 
                  : 'border-transparent hover:border-indigo-100'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              {/* Animated background on hover */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0"
                animate={{ 
                  opacity: activeIndex === index ? 0.05 : 0,
                  transition: { duration: 0.3 }
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white/50 shadow-lg group-hover:border-indigo-200 transition-colors duration-300"
                    />
                    {/* Glow effect on avatar */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                  <div>
                    <motion.h3 
                      className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300"
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      {testimonial.name}
                    </motion.h3>
                    <motion.p 
                      className="text-sm font-medium text-gray-500/90 group-hover:text-indigo-500/90 transition-all duration-300"
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.1 }}
                      viewport={{ once: true }}
                    >
                      {testimonial.role}
                    </motion.p>
                  </div>
                </div>
                <motion.div 
                  className="flex gap-1 mb-6"
                  variants={fadeInUp}
                  custom={index}
                >
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.svg 
                      key={i} 
                      className="w-6 h-6 text-yellow-400 group-hover:text-yellow-500 transition-colors duration-300" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      variants={fadeInUp}
                      custom={i}
                      whileHover={{ scale: 1.2, rotate: 15 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </motion.svg>
                  ))}
                </motion.div>
                <motion.p 
                  className="text-gray-700 leading-relaxed relative z-10 italic group-hover:text-gray-900 transition-colors duration-300 text-lg"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.8 }}
                  viewport={{ once: true }}
                >
                  &ldquo;{testimonial.content}&rdquo;
                </motion.p>
              </div>
              {/* Hover accent line at bottom */}
              <motion.div 
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 w-0 group-hover:w-full transition-all duration-700"
                initial={{ width: 0 }}
                whileHover={{ width: "100%" }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}