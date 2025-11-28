// components/InfiniteMarquee.tsx
import React from "react";
import styled from "styled-components";
import Link from "next/link";
const InfiniteMarquee = () => {
  const items = [
    { emoji: "New", text: "iPhone 13 Pro chỉ 8tr" },
    { emoji: "Hot", text: "MacBook Air M1 giảm 30%" },
    { emoji: "Limited", text: "Tai nghe Sony WH-1000XM4" },
    { emoji: "Deal", text: "Xe đạp địa hình 2nd 2.5tr" },
    { emoji: "Trending", text: "Đồng hồ thông minh 500k" },
    { emoji: "Sale", text: "Ghế gaming RGB fullbox" },
  ];

  return (
    <StyledSection>
      <Container>
        <MarqueeHeader>Sẵn sàng bắt đầu?</MarqueeHeader>
        <MarqueeSub>
          Tham gia cộng đồng RetroTrade ngay hôm nay và khám phá những cơ hội
          tuyệt vời
        </MarqueeSub>

        <StyledWrapper>
          <div className="marquee">
            <div className="marquee__inner">
              {/* Group 1 */}
              <div className="marquee__group">
                {items.map((item, i) => (
                  <span key={i}>
                    <span className="emoji">{item.emoji}</span> {item.text}
                  </span>
                ))}
              </div>
              {/* Group 2 - để tạo infinite */}
              <div className="marquee__group">
                {items.map((item, i) => (
                  <span key={i + items.length}>
                    <span className="emoji">{item.emoji}</span> {item.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </StyledWrapper>

        {/* CTA Buttons */}
        <CTAButtons>
          <div className="flex gap-4">
            <Link href="/auth/register">
              <ButtonPrimary>Đăng ký miễn phí</ButtonPrimary>
            </Link>

            <Link href="/about">
              <ButtonOutline>Tìm hiểu thêm</ButtonOutline>
            </Link>
          </div>
        </CTAButtons>
      </Container>
    </StyledSection>
  );
};

// ===========================================
// STYLED COMPONENTS - NỀN TRẮNG
// ===========================================

const StyledSection = styled.section`
  padding: 5rem 0;
  background: #ffffff; /* Nền trắng */
  color: #1a1a1a;
  position: relative;
  overflow: hidden;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  text-align: center;
`;

const MarqueeHeader = styled.h2`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(to right, #7c3aed, #4f46e5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 640px) {
    font-size: 2rem;
  }
`;

const MarqueeSub = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
`;

// === MARQUEE STYLES (NỀN TRẮNG) ===
const StyledWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  margin: 2rem 0;

  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );

  .marquee__inner {
    display: flex;
    width: max-content;
    animation: marquee 18s linear infinite;
  }

  .marquee__group {
    display: flex;
    gap: 2rem;
    padding: 0 1rem;
  }

  .marquee__group span {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: white;
    padding: 0.5rem 1.25rem;
    border-radius: 9999px;
    font-size: 1.1rem;
    font-weight: 600;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-2px);
    }
  }

  .emoji {
    font-weight: bold;
    font-size: 1.1em;
  }

  @keyframes marquee {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  @media (max-width: 640px) {
    .marquee__group {
      gap: 1rem;
    }
    .marquee__group span {
      font-size: 0.95rem;
      padding: 0.4rem 1rem;
    }
  }
`;

// === CTA BUTTONS (NỀN TRẮNG) ===
const CTAButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin-top: 2rem;

  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: center;
  }
`;

const ButtonPrimary = styled.button`
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: white;
  font-weight: 700;
  font-size: 1.125rem;
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);

  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.4);
  }
`;

const ButtonOutline = styled.button`
  background: transparent;
  color: #7c3aed;
  border: 2px solid #7c3aed;
  font-weight: 600;
  font-size: 1.125rem;
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #7c3aed;
    color: white;
    transform: translateY(-3px) scale(1.05);
  }
`;

export default InfiniteMarquee;
