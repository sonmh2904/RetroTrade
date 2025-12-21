import { HeroSection } from "@/components/ui/home/hero-section"
import { FeaturesSection } from "@/components/ui/home/features-section"
import { StorySection } from "@/components/ui/home/story-section"
import { TestimonialsSection } from "@/components/ui/home/testimonials-section"
import { CTASection } from "@/components/ui/home/cta-section"
import { ThreeBackground } from "@/components/ui/home/three-background"
import FeaturedProductsSlider from "@/components/ui/products/featured-products-slider"
import BlogHighlightSection from "@/components/ui/home/blog-highlight-section"
import { EventThemeSection } from "@/components/ui/common/event-theme-section";

export default function HomePage() {
    return (
        <div className="relative min-h-screen bg-white">
            <ThreeBackground />
            <main>
                <HeroSection />
                
                <EventThemeSection />

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
