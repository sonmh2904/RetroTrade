"use client"

import { motion, Variants, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { ArrowRight, ChevronLeft, ChevronRight, Quote, Sparkles } from "lucide-react"

const stories = [
  {
    id: 1,
    title: "Ý tưởng và cảm hứng",
    content: "RetroTrade ra đời từ một ý tưởng giản dị nhưng đầy khát vọng: biến những món đồ không còn dùng tới thành nguồn tài nguyên quý giá. Nhóm sáng lập được truyền cảm hứng từ việc nhìn thấy hàng ngàn món đồ vẫn còn giá trị bị bỏ phí, đồng thời nhận ra rằng việc tái sử dụng đồ cũ không chỉ giúp tiết kiệm chi phí mà còn góp phần giảm rác thải và bảo vệ môi trường. Ý tưởng này không chỉ là kinh tế mà còn là lời kêu gọi cộng đồng sống xanh, bền vững hơn mỗi ngày.",
    author: "RetroTrade",
    role: "Nguồn cảm hứng và ý tưởng",
    image: "/stories/story-1.jpg",
    stats: "Từ những nhu cầu thực tế hàng ngày"
  },
  {
    id: 2,
    title: "Hành trình thực hiện",
    content: "Từ ý tưởng, RetroTrade bắt đầu xây dựng nền tảng trực tuyến dễ sử dụng, nơi người dùng có thể cho thuê, thuê lại hoặc chia sẻ đồ dùng chất lượng. Mỗi tính năng được thiết kế để đơn giản hóa quy trình trao đổi, đảm bảo minh bạch và thuận tiện. Đồng thời, chúng tôi triển khai các chương trình ưu đãi, sự kiện cộng đồng và hướng dẫn cách tái sử dụng đồ cũ, để việc sống xanh không chỉ là lý thuyết mà trở thành thói quen thực tế trong đời sống hàng ngày.",
    author: "RetroTrade",
    role: "Hành trình thực hiện",
    image: "/stories/story-2.jpg",
    stats: "Nhiều món đồ được tái sử dụng mỗi ngày"
  },
  {
    id: 3,
    title: "Ý nghĩa và thông điệp",
    content: "Qua từng giao dịch, từng câu chuyện chia sẻ, RetroTrade trở thành cầu nối kết nối cộng đồng những người yêu môi trường. Chúng tôi mong muốn gửi gắm thông điệp rằng mỗi hành động nhỏ như thuê đồ cũ, chia sẻ kinh nghiệm hay tái sử dụng một món đồ đều mang ý nghĩa to lớn: giảm rác thải, tiết kiệm tài nguyên và xây dựng lối sống bền vững. RetroTrade không chỉ là nền tảng giao dịch, mà còn là nơi truyền cảm hứng, lan tỏa giá trị xanh đến mọi người và góp phần xây dựng một hành tinh xanh hơn cho thế hệ mai sau.",
    author: "RetroTrade",
    role: "Ý nghĩa và thông điệp",
    image: "/stories/story-3.jpeg",
    stats: "Cộng đồng rộng lớn và ngày càng phát triển"
  }
];


const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  })
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
}

const slideIn = (direction: 'left' | 'right'): Variants => ({
  hidden: { 
    x: direction === 'left' ? -100 : 100,
    opacity: 0 
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
})

export function StorySection() {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const nextStory = () => {
    setCurrentStoryIndex((prev) => (prev + 1) % stories.length)
  }

  const prevStory = () => {
    setCurrentStoryIndex((prev) => (prev - 1 + stories.length) % stories.length)
  }

  const goToStory = (index: number) => {
    setCurrentStoryIndex(index)
  }

  useEffect(() => {
    if (!isHovering) {
      intervalRef.current = window.setInterval(() => {
        nextStory()
      }, 5000)
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isHovering])

  const currentStory = stories[currentStoryIndex]

  return (
    <section 
      className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
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
            className="inline-flex items-center gap-2 mb-6 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-sm font-semibold shadow-lg"
            variants={fadeInUp}
            custom={0}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            CÂU CHUYỆN RETROTRADE
          </motion.div>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            variants={fadeInUp}
            custom={1}
          >
            Hành trình <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              RetroTrade
            </span>
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 max-w-3xl mx-auto"
            variants={fadeInUp}
            custom={2}
          >
            Khám phá hành trình phát triển và những cột mốc ý nghĩa của RetroTrade trong sứ mệnh sống xanh
          </motion.p>
        </motion.div>

        {/* Story Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image with parallax effect */}
          <motion.div 
            className="relative"
            variants={slideIn('left')}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px 0px -100px 0px" }}
          >
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStory.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                  className="relative aspect-[4/3]"
                >
                  <Image
                    src={currentStory.image}
                    alt={currentStory.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Decorative elements */}
            <motion.div 
              className="absolute -top-6 -left-6 w-32 h-32 bg-indigo-100/50 rounded-full -z-10 blur-xl"
              initial={{ scale: 0.8, opacity: 0.5 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
            <motion.div 
              className="absolute -bottom-8 -right-8 w-40 h-40 bg-purple-100/50 rounded-full -z-10 blur-xl"
              initial={{ scale: 0.8, opacity: 0.5 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            />
          </motion.div>

          {/* Story Content */}
          <motion.div 
            className="relative"
            variants={slideIn('right')}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px 0px -100px 0px" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                
                <h3 className="text-3xl font-bold text-gray-900">{currentStory.title}</h3>
                
                <div className="relative">
                  <Quote className="absolute -top-4 -left-2 text-gray-200 w-12 h-12 -z-10" />
                  <p className="text-lg text-gray-600 leading-relaxed pl-8">
                    "{currentStory.content}"
                  </p>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <p className="font-semibold text-gray-900">{currentStory.author}</p>
                  <p className="text-sm text-gray-500">{currentStory.role}</p>
                  <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm">
                    <Sparkles className="w-4 h-4" />
                    {currentStory.stats}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Dots */}
            <div className="flex justify-center lg:justify-start gap-2 mt-8">
              {stories.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStory(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentStoryIndex 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 w-8' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  aria-label={`Chuyển đến câu chuyện ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="hidden lg:flex gap-4 mt-8">
              <button
                onClick={prevStory}
                className="p-3 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                aria-label="Câu chuyện trước"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={nextStory}
                className="p-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
                aria-label="Câu chuyện tiếp theo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Animated floating elements */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-16 h-16 bg-amber-200/30 rounded-full -z-10"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "reverse"
        }}
      />
      <motion.div 
        className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-purple-200/30 rounded-full -z-10"
        animate={{
          y: [0, 20, 0],
          x: [0, -15, 0],
          scale: [1, 0.9, 1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "reverse",
          delay: 1
        }}
      />
    </section>
  )
}

// Star icon component for ratings
function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}