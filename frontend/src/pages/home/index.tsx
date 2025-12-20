import { HeroSection } from "@/components/ui/home/hero-section"
import { FeaturesSection } from "@/components/ui/home/features-section"
import { StorySection } from "@/components/ui/home/story-section"
import { TestimonialsSection } from "@/components/ui/home/testimonials-section"
import { CTASection } from "@/components/ui/home/cta-section"
import { ThreeBackground } from "@/components/ui/home/three-background"
import FeaturedProductsSlider from "@/components/ui/products/featured-products-slider"
import BlogHighlightSection from "@/components/ui/home/blog-highlight-section"
import { Container } from "@/components/layout/Container"
import { 
  ChristmasCard, 
  ChristmasCountdown, 
  ChristmasButton,
  ChristmasTree,
  ChristmasBadge
} from "@/components/ui/common/christmas"

export default function HomePage() {
    return (
        <div className="relative min-h-screen bg-white">
            <ThreeBackground />
            <main>
                <HeroSection />
                
                {/* Christmas Countdown Section */}
                <section className="py-12 bg-gradient-to-br from-red-50 via-white to-green-50">
                    <Container>
                        <div className="max-w-2xl mx-auto">
                            <ChristmasCountdown />
                        </div>
                    </Container>
                </section>

                {/* Christmas Special Section */}
                <section className="py-16 bg-white">
                    <Container>
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div>
                                <ChristmasCard
                                    title="🎄 Mùa Giáng Sinh Đặc Biệt 🎄"
                                    message="RetroTrade chúc bạn một mùa Giáng Sinh ấm áp và hạnh phúc! Khám phá những sản phẩm độc đáo với giá ưu đãi đặc biệt."
                                >
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                                        <ChristmasButton 
                                            variant="default" 
                                            size="md"
                                            onClick={() => window.location.href = "/products"}
                                        >
                                            Khám Phá Sản Phẩm
                                        </ChristmasButton>
                                        <ChristmasButton 
                                            variant="outline" 
                                            size="md"
                                            onClick={() => window.location.href = "/about"}
                                        >
                                            Tìm Hiểu Thêm
                                        </ChristmasButton>
                                    </div>
                                </ChristmasCard>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-8">
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-6">
                                        <ChristmasBadge variant="gold" size="lg">Giáng Sinh 2025</ChristmasBadge>
                                    </h3>
                                    <div className="flex items-center justify-center">
                                        <ChristmasTree size="md" animated={true} showOrnaments={true} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                <BlogHighlightSection />
                <FeaturedProductsSlider />
                <StorySection />
                <FeaturesSection />
                <TestimonialsSection />
                <CTASection />
            </main>
        </div>
    )
}
