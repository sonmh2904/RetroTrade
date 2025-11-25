import React from "react";
import styled from "styled-components";

const CardPay = () => {
  return (
    <StyledWrapper>
      <div className="cards">
        <div className="card one">
          <div className="cardDetails">
            <div className="cardDetailsHaeder">Thanh toán ngay</div>
          </div>
        </div>
        <div className="card two">
          <div className="cardDetails">
            <div className="cardDetailsHaeder">Thanh toán sau</div>
          </div>
        </div>
        <div className="card three">
          <svg
            viewBox="0 0 24 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="0.539915"
              y="6.28937"
              width={21}
              height={4}
              rx="1.5"
              transform="rotate(-4.77865 0.539915 6.28937)"
              fill="#7D6B9D"
              stroke="black"
            />
            <circle
              cx="11.5"
              cy="5.5"
              r="4.5"
              fill="#E7E037"
              stroke="#F9FD50"
              strokeWidth={2}
            />
            <path
              d="M2.12011 6.64507C7.75028 6.98651 12.7643 6.94947 21.935 6.58499C22.789 6.55105 23.5 7.23329 23.5 8.08585V24C23.5 24.8284 22.8284 25.5 22 25.5H2C1.17157 25.5 0.5 24.8284 0.5 24V8.15475C0.5 7.2846 1.24157 6.59179 2.12011 6.64507Z"
              fill="#BF8AEB"
              stroke="black"
            />
            <path
              d="M16 13.5H23.5V18.5H16C14.6193 18.5 13.5 17.3807 13.5 16C13.5 14.6193 14.6193 13.5 16 13.5Z"
              fill="#BF8AEB"
            />
          </svg>
          <div className="cardDetails">
            <div className="cardDetailsHaeder">Thanh toán ngay</div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .cards {
    position: relative;
  }

  .card {
    z-index: 1;
    position: absolute;
    width: 150px;
    height: 100px;
    border-radius: 10px;
    outline: 1px solid #08CB00;
    transition: all 0.5s ease-out;
    overflow: hidden;
    transform: translateX(0px) translateY(0px) perspective(905px) rotateX(0deg)
      rotateY(0deg) rotateZ(-8deg);
  }

  .card.one {
    top: -120px;
    left: -150px;
    background: linear-gradient(
      180deg,
      #a8e6cf 0%,
      #56c596 100%
    ); /* xanh lá nhạt → xanh lá */
  }

  .card.two {
    top: -95px;
    left: -125px;
    background: linear-gradient(
      180deg,
      #fff3b0 0%,
      #ffe066 100%
    ); /* vàng nhạt → vàng */
  }

  .card.three {
    top: -70px;
    left: -100px;

    background: linear-gradient(
      180deg,
      #89c2f0 0%,
      #4682b4 100%
    ); /* xanh dương nhạt → xanh dương */
  }

  .card:hover {
    z-index: 4;
    transform: perspective(1000px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) !important;
    transition: all 0.5s ease-out;
  }

  .cardDetails {
    width: 55%;
    height: 100%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    background: #5de2a3;
    transition: 0.5s;
    transform-origin: left;
    transform: perspective(2000px) rotateY(-90deg);
  }

  .card:hover .cardDetails {
    transform: perspective(2000px) rotateY(0deg);
  }

  .cardDetailsHaeder {
    font-weight: 600;
    color: #11224e;
    padding-top: 0px;
  }
`;

export default CardPay;
