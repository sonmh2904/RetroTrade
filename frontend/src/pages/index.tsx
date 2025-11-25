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
import styles from "@/styles/TwoLayouts.module.css";
import HoverCard from "@/components/ui/common/FlipCard";
import InfiniteMarquee from "@/components/ui/common/InfiniteMarquee";
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
      <section className="relative overflow-hidden  flex items-center">
        <div className={styles.body}>
          <div className={styles.leftSide}>
            <p>
              Đăng tin nhanh,
              <br />
              thương lượng trực tiếp, giao dịch an toàn.
            </p>
            <div className={styles.imageWrapper}>
              <Image
                src="/flower.gif"
                alt="Flower"
                fill
                className={styles.flowerImage}
                priority
              />
            </div>
          </div>

          <div className={styles.rightSide}>
            <div
              className={styles.containerShape}
              style={{
                backgroundImage: `url('/liquid.gif')`,
              }}
            >
              Content here...
            </div>

            <div className={styles.floatingBlock1}>
              <h3>Khám phá</h3>
              <p>Nơi đồ cũ tìm được chủ mới!</p>
            </div>

            <div className={styles.floatingBlock2}>
              <h4>
                Tiết kiệm – độc đáo – phong cách
                <br />
                Thuê hôm nay, tỏa sáng ngay
              </h4>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <SectionHeading>Tại sao chọn RetroTrade?</SectionHeading>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-4">
              Chúng tôi cung cấp giải pháp toàn diện cho việc buôn bán đồ cũ với
              công nghệ hiện đại
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            <HoverCard
              icon={<Zap className="w-12 h-12" />}
              title="Đăng tin siêu nhanh"
              description="Chỉ cần 3 phút để đăng sản phẩm với AI hỗ trợ mô tả và định giá"
              gradient="-45deg, #c084fc 0%, #f472b6 100%"
            />
            <HoverCard
              icon={<MessageCircle className="w-12 h-12" />}
              title="Chat trực tiếp"
              description="Thương lượng giá cả và điều kiện giao dịch ngay trên nền tảng"
              gradient="-45deg, #93c5fd 0%, #a78bfa 100%"
            />
            <HoverCard
              icon={<Shield className="w-12 h-12" />}
              title="Bảo mật tuyệt đối"
              description="Xác thực danh tính, đánh giá uy tín và bảo vệ giao dịch"
              gradient="-45deg, #c084fc 0%, #f472b6 100%"
            />
            <HoverCard
              icon={<TrendingUp className="w-12 h-12" />}
              title="Gợi ý thông minh"
              description="AI phân tích thị trường để đề xuất giá phù hợp nhất"
              gradient="-45deg, #93c5fd 0%, #a78bfa 100%"
            />
            <HoverCard
              icon={<Users className="w-12 h-12" />}
              title="Cộng đồng lớn"
              description="Kết nối với hàng nghìn người dùng tin cậy trên toàn quốc"
              gradient="-45deg, #c084fc 0%, #f472b6 100%"
            />
            <HoverCard
              icon={<Heart className="w-12 h-12" />}
              title="Dịch vụ tận tâm"
              description="Hỗ trợ 24/7 và cam kết mang đến trải nghiệm tốt nhất"
              gradient="-45deg, #93c5fd 0%, #a78bfa 100%"
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
                  <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto group-hover:shadow-xl transition-all duration-300">
                    <span className="text-3xl">{step.icon}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <InfiniteMarquee />
    </>
  );
}
