// components/HoverCard.tsx
import React from "react";
import styled from "styled-components";

interface HoverCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient?: string;
}

const HoverCard: React.FC<HoverCardProps> = ({
  icon,
  title,
  description,
  gradient = "-45deg, #f89b29 0%, #ff0f7b 100%",
}) => {
  return (
    <StyledWrapper gradient={gradient}>
      <div className="card">
       
        <div className="card__front">
          <div className="card__icon-wrapper">
            {icon}
            <p className="card__title-front">{title}</p>
          </div>
        </div>

      
        <div className="card__content">
          <p className="card__title">{title}</p>
          <p className="card__description">{description}</p>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ gradient: string }>`
  .card {
    position: relative;
    width: 300px;
    height: 200px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background: linear-gradient(${({ gradient }) => gradient});
    backdrop-filter: blur(4px);
  }

  .card__front {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    z-index: 2;
  }

  .card__icon-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 130px;
    height: 130px;
    padding: 20px;

    background: rgba(255, 255, 255, 0.22);
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
      inset 0 2px 6px rgba(255, 255, 255, 0.3);

    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .card__icon-wrapper svg {
    width: 48px;
    height: 48px;
    color: #41a67e;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .card__title-front {
    margin-top: 10px;
    margin-bottom: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #393d7e;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    line-height: 1.3;
    text-align: center;
    letter-spacing: 0.3px;
  }

  .card:hover .card__front {
    opacity: 0;
    transform: scale(0.7) rotate(-15deg);
  }

  .card:hover .card__icon-wrapper {
    transform: scale(0.6);
    backdrop-filter: blur(4px);
  }

  .card:hover {
    transform: rotate(-5deg) scale(1.1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .card__content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    width: 100%;
    height: 100%;
    padding: 24px;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 16px;
    opacity: 0;
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
  }

  .card:hover .card__content {
    transform: translate(-50%, -50%) rotate(0deg);
    opacity: 1;
  }

  .card__title {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #6677ee;
    line-height: 1.3;
  }

  .card__description {
    margin: 0;
    font-size: 0.875rem;
    color: #444;
    line-height: 1.6;
    word-break: keep-all;
    overflow-wrap: break-word;
  }

  /* === RESPONSIVE === */
  @media (max-width: 640px) {
    .card {
      width: 260px;
      height: 180px;
    }

    .card__icon-wrapper {
      width: 110px;
      height: 110px;
      padding: 16px;
    }

    .card__icon-wrapper svg {
      width: 36px;
      height: 36px;
    }

    .card__title-front {
      font-size: 0.9rem;
      margin-top: 8px;
    }

    .card__title {
      font-size: 1.25rem;
    }

    .card__description {
      font-size: 0.8rem;
    }
  }
`;

export default HoverCard;
