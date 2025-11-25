"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    title: "Đăng tin nhanh – Giao dịch an toàn",
    description:
      "Thương lượng trực tiếp, tiết kiệm thời gian, kết nối cộng đồng mua bán đồ cũ.",
    image: "/page1.jpg",
  },
  {
    title: "Nền tảng trao đổi đồ cũ uy tín",
    description:
      "Công nghệ hiện đại giúp bạn mua bán nhanh chóng và an toàn tuyệt đối.",
    image: "/page2.jpg",
  },
  {
    title: "Tiết kiệm – Bền vững – Thông minh",
    description: "Giúp đồ cũ tìm được chủ mới, góp phần bảo vệ môi trường.",
    image: "/page3.jpg",
  },
  {
    title: "Tái sử dụng – Bảo vệ hành tinh",
    description: "Hạn chế rác thải, tăng vòng đời sản phẩm.",
    image: "/page4.jpg",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={index === 0}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white max-w-2xl px-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {slide.title}
              </h1>
              <p className="text-lg md:text-xl mb-6">{slide.description}</p>
              <Link href="/products">
                <button className="bg-purple-600 hover:bg-purple-700 transition px-6 py-3 rounded-full font-semibold">
                  Khám phá ngay
                </button>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Prev / Next */}
      <button
        onClick={prevSlide}
        className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white text-black w-10 h-10 rounded-full flex items-center justify-center z-20"
      >
        ❮
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white text-black w-10 h-10 rounded-full flex items-center justify-center z-20"
      >
        ❯
      </button>

      {/* Dots */}
      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-3 h-3 rounded-full transition ${
              index === current ? "bg-white scale-125" : "bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* ✅ Thumbnails (ảnh nhỏ) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-20">
        {slides.map((item, index) => (
          <div
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-20 h-20 rounded-full border-2 cursor-pointer transition-all 
              ${
                index === current
                  ? "border-white scale-110"
                  : "border-white/40 opacity-70 hover:opacity-100"
              }`}
            style={{
              backgroundImage: `url(${item.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>
        ))}
      </div>
    </section>
  );
}
