import React from 'react';
import styled from 'styled-components';

const CardWallet = () => {
  return (
    <StyledWrapper>
      <div className="walletBalanceCard mt-0.5">
        <div className="svgwrapper">
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
              stroke="black"
            />
          </svg>
        </div>
        <div className="balancewrapper">
          <span className="balanceHeading">Wallet balance</span>
          <p className="balance">
            <span id="currency"></span>890.000 VND
          </p>
        </div>
        <button className="addmoney">
          <span className="plussign">+</span>Nạp tiền
        </button>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .walletBalanceCard {
    width: fit-content;
    height: 55px;
   
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 0px 12px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .svgwrapper {
    width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .svgwrapper svg {
    width: 100%;
  }
  .balancewrapper {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    width: 120px;
    gap: 0px;
  }
  .balanceHeading {
    font-size: 8px;
    color: black;
    font-weight: 100;
    letter-spacing: 0.6px;
  }
  .balance {
    font-size: 13.5px;
    color: black;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .addmoney {
    padding: 1px 15px;
    border-radius: 20px;
    background-color: #c083eb;
    color: white;
    border: none;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .addmoney:hover {
    background-color: whitesmoke;
    color: #9c59cc;
  }
  .plussign {
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }`;

export default CardWallet;
