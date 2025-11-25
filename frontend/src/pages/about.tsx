import Head from "next/head";
import { AboutHero } from "@/components/ui/home/about/about-hero";
import { AboutStory } from "@/components/ui/home/about/about-story";
import { AboutValues } from "@/components/ui/home/about/about-values";
import { AboutStats } from "@/components/ui/home/about/about-stats";
import { CTASection } from "@/components/ui/home/cta-section";

export default function About() {
  return (
    <>
      <Head>
        <title>Về chúng tôi - RetroTrade</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Tìm hiểu về RetroTrade - nền tảng buôn bán đồ cũ uy tín và hiệu quả" />
      </Head>

      <AboutHero />
      <AboutStory />
      <AboutStats />
      <AboutValues />
      {/* <AboutTeam /> */}
      <CTASection />
    </>
  );
}