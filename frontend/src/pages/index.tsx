"use client";

import Head from "next/head";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { SectionHeading } from "@/components/ui/common/section-heading";
import {
  Shield,
  Zap,
  Users,
  TrendingUp,
  MessageCircle,
  Heart,
} from "lucide-react";
import HoverCard from "@/components/ui/common/FlipCard";
import InfiniteMarquee from "@/components/ui/common/InfiniteMarquee";
import HeroSlider from "@/components/ui/home/heroslider";
import { motion } from "framer-motion";
import CardCheckout from "@/components/ui/common/CardCheckout";
import CardWallet from "@/components/ui/common/CardWallet";
import CardPay from "@/components/ui/common/CardMethodPay";
export default function Home() {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Nền tảng buôn bán và trao đổi đồ cũ uy tín, an toàn và hiệu quả"
        />
      </Head>

      {/* Hero Section */}

      <HeroSlider />

      {/* Features Section */}
      <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 30 }} // bắt đầu ở dưới
                animate={{ opacity: 1, y: 0 }} // kéo lên và hiện ra
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <SectionHeading>Tại sao chọn RetroTrade?</SectionHeading>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-4">
                  Chúng tôi cung cấp giải pháp toàn diện cho việc buôn bán đồ cũ
                  với công nghệ hiện đại
                </p>
              </motion.div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center text-ba">
            <HoverCard
              icon={<Zap className="w-12 h-12" />}
              title="Đăng tin siêu nhanh"
              description="Chỉ cần 3 phút để đăng sản phẩm với AI hỗ trợ mô tả và định giá"
              gradient="-45deg, #f3e8ff 0%, #e9d5ff 100%"
            />
            <HoverCard
              icon={<MessageCircle className="w-12 h-12" />}
              title="Chat trực tiếp"
              description="Thương lượng giá cả và điều kiện giao dịch ngay trên nền tảng"
              gradient="-45deg, #eff6ff 0%, #dbeafe 100%"
            />
            <HoverCard
              icon={<Shield className="w-12 h-12" />}
              title="Bảo mật tuyệt đối"
              description="Xác thực danh tính, đánh giá uy tín và bảo vệ giao dịch"
              gradient="-45deg, #ecfeff 0%, #cffafe 100%"
            />
            <HoverCard
              icon={<TrendingUp className="w-12 h-12" />}
              title="Gợi ý thông minh"
              description="AI phân tích thị trường để đề xuất giá phù hợp nhất"
              gradient="-45deg, #fff7ed 0%, #ffedd5 100%"
            />
            <HoverCard
              icon={<Users className="w-12 h-12" />}
              title="Cộng đồng lớn"
              description="Kết nối với hàng nghìn người dùng tin cậy trên toàn quốc"
              gradient="-45deg, #fdf2f8 0%, #fce7f3 100%"
            />
            <HoverCard
              icon={<Heart className="w-12 h-12" />}
              title="Dịch vụ tận tâm"
              description="Hỗ trợ 24/7 và cam kết mang đến trải nghiệm tốt nhất"
              gradient="-45deg, #f0fdfa 0%, #ccfbf1 100%"
            />
          </div>
        </Container>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <Container>
          <div className="text-center mb-16">
            <SectionHeading>Quy trình đơn giản</SectionHeading>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-4">
              Chỉ với 4 bước đơn giản, bạn có thể bắt đầu giao dịch ngay hôm nay
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Đăng sản phẩm",
                description: "Chụp ảnh, mô tả và đặt giá cho sản phẩm của bạn",
                icon: "📱",
              },
              {
                step: "02",
                title: "Tìm người mua",
                description: "Hệ thống tự động gợi ý người mua phù hợp",
                icon: "🔍",
              },
              {
                step: "03",
                title: "Thương lượng",
                description: "Chat trực tiếp để thỏa thuận giá và điều kiện",
                icon: "💬",
              },
              {
                step: "04",
                title: "Hoàn tất giao dịch",
                description: "Xác nhận, đánh giá và hoàn tất đơn hàng",
                icon: "✅",
              },
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div
                    className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto 
                        group-hover:shadow-xl transition-all duration-300"
                  >
                    {/* Thêm scale khi hover */}
                    <span className="text-3xl transition-transform duration-300 group-hover:scale-125">
                      {step.icon}
                    </span>
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 
                        rounded-full flex items-center justify-center text-white text-sm font-bold"
                  >
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="pt-15 flex gap-4">
            <div className="w-1/2 px-70 pt-30">
              <CardPay />
            </div>
            <div className="w-1/2 px-20">
              <CardCheckout />
              <CardWallet />
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <InfiniteMarquee />
    </>
  );
}
