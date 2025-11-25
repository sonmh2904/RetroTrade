"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const heroItems = [
  {
    mainImage: "/banners/kham-pha-san-pham.jpg",
    title: "RetroTrade - Nền tảng cho thuê đồ cũ",
    subtitle: "Tiết kiệm chi phí, bảo vệ môi trường",
    description: "RetroTrade là nền tảng hàng đầu tại Việt Nam giúp bạn thuê và chia sẻ đồ dùng chất lượng. Giải pháp thông minh để bạn tiết kiệm chi phí, trải nghiệm tiện lợi và góp phần giảm rác thải.",
    buttonText: "Tìm hiểu thêm",
    buttonHref: "/about",
    previewImages: ["/banners/tiet-kiem-chi-phi.jpg", "/banners/bao-ve-moi-truong.jpg", "/banners/discount.jpg"],
  },
  {
    mainImage: "/banners/tiet-kiem-chi-phi.jpg",
    title: "Tiết kiệm tối đa chi phí",
    subtitle: "Thuê thay vì mua",
    description: "Thay vì mua mới, bạn có thể thuê những món đồ chất lượng với giá chỉ bằng 30% chi phí. RetroTrade giúp bạn vừa tiết kiệm, vừa duy trì phong cách và linh hoạt trong mọi nhu cầu sử dụng.",
    buttonText: "Xem sản phẩm",
    buttonHref: "/products",
    previewImages: ["/banners/bao-ve-moi-truong.jpg", "/banners/discount.jpg", "/banners/ket-noi-cong-dong.jpg"],
  },
  {
    mainImage: "/banners/bao-ve-moi-truong.jpg",
    title: "Bảo vệ môi trường cùng RetroTrade",
    subtitle: "Tái sử dụng thông minh, giảm thiểu rác thải",
    description: "Mỗi món đồ được thuê và tái sử dụng là một bước ý nghĩa trong việc bảo vệ môi trường. Tham gia RetroTrade để giảm thiểu rác thải, sống bền vững và góp phần xây dựng hành tinh xanh hơn.",
    buttonText: "Tham gia cộng đồng",
    buttonHref: "/join",
    previewImages: ["/banners/discount.jpg", "/banners/ket-noi-cong-dong.jpg", "/banners/kham-pha-san-pham.jpg"],
  },
  {
    mainImage: "/banners/discount.jpg",
    title: "Nhận ưu đãi hấp dẫn khi thuê đồ",
    subtitle: "Mua sắm thông minh, tiết kiệm hơn",
    description: "Đăng ký tài khoản RetroTrade ngay hôm nay để nhận những ưu đãi đặc biệt khi thuê đồ cũ. Tiết kiệm chi phí, tận hưởng dịch vụ chất lượng và trải nghiệm mua sắm thông minh.",
    buttonText: "Tham gia ngay",
    buttonHref: "/auth/register",
    previewImages: ["/banners/ket-noi-cong-dong.jpg", "/banners/kham-pha-san-pham.jpg", "/banners/tiet-kiem-chi-phi.jpg"],
  },
  {
    mainImage: "/banners/ket-noi-cong-dong.jpg",
    title: "Kết nối cộng đồng bền vững",
    subtitle: "Chia sẻ, giao lưu và học hỏi",
    description: "Tham gia cộng đồng RetroTrade, nơi mọi người cùng nhau chia sẻ đồ dùng, học hỏi kinh nghiệm và trải nghiệm các giá trị bền vững. Tạo kết nối, tiết kiệm và cùng bảo vệ môi trường.",
    buttonText: "Tham gia ngay",
    buttonHref: "/community",
    previewImages: ["/banners/kham-pha-san-pham.jpg", "/banners/tiet-kiem-chi-phi.jpg", "/banners/bao-ve-moi-truong.jpg"],
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const timer = useRef<number | null>(null);
  
  useEffect(() => {
    startAuto();
    return () => {
      if (timer.current !== null) {
        clearInterval(timer.current);
      }
    };
  }, [currentSlide]);
  
  const startAuto = () => {
    if (timer.current !== null) {
      clearInterval(timer.current);
    }
    timer.current = window.setInterval(() => nextSlide(), 5000);
  };
  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % heroItems.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + heroItems.length) % heroItems.length);
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    startAuto();
  };
  const currentItem = heroItems[currentSlide];
  return (
    <section className="relative h-[600px] w-full overflow-hidden font-['Be_Vietnam_Pro',sans-serif]">
      {/* Full-width background image */}
      <div 
        className="absolute inset-0 w-full h-full z-0"
        style={{
          backgroundImage: 'url("/banners/about-1.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="absolute inset-0 bg-black/40 z-10" />

      <div className="relative z-20 h-full flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                {/* Main image background */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${currentItem.mainImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                  
                  <div className="relative z-10 h-full w-full p-8 flex flex-col md:flex-row items-center">
                    <div className="w-full md:w-1/2 flex items-center">
                      <div className="max-w-md relative">
                        
                        <motion.h1 
                          className="text-4xl md:text-5xl font-bold mb-6 text-white drop-shadow-lg font-['Be_Vietnam_Pro',sans-serif]"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                        >
                          {currentItem.title}
                        </motion.h1>
                        <motion.p 
                          className="text-xl mb-6 text-amber-100 font-semibold font-['Be_Vietnam_Pro',sans-serif] drop-shadow-md"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
                        >
                          {currentItem.subtitle}
                        </motion.p>
                        <motion.p 
                          className="mb-8 text-white/90 font-normal leading-relaxed font-['Be_Vietnam_Pro',sans-serif] text-justify drop-shadow-sm"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
                        >
                          {currentItem.description}
                        </motion.p>
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 flex items-center justify-center md:justify-end mt-8 md:mt-0 md:pl-8">
                      <div className="relative h-[400px] flex items-end gap-6">
                        {currentItem.previewImages.map((img, index) => (
                          <motion.div
                            key={index}
                            className="relative w-40 h-56 rounded-xl overflow-hidden shadow-2xl hover:shadow-2xl transition-all"
                            whileHover={{ y: -20, scale: 1.05 }}
                            initial={{ y: 60, opacity: 0, rotate: 5 - (index * 2) }}
                            animate={{ y: 0, opacity: 1, rotate: 0 }}
                            transition={{ 
                              delay: 0.3 + (index * 0.15),
                              type: 'spring',
                              stiffness: 80,
                              damping: 10
                            }}
                            style={{
                              zIndex: 3 - index,
                              transformOrigin: 'bottom center'
                            }}
                          >
                            <img
                              src={img}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation dots */}
          <div className="flex justify-center mt-8 space-x-2">
            {heroItems.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-orange-500 scale-125' : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}