import { CheckCircleOutlined } from '@ant-design/icons';
import Header from '@/components/common/header';
import Footer from '@/components/common/footer';

export default function PaymentSuccess() {
  return (
    <div>
      <Header />
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 16px",
        background: "#fff",
        borderRadius: 12,
        maxWidth: 400,
        margin: "60px auto",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)"
      }}
    >
      <CheckCircleOutlined style={{ fontSize: 56, color: "#52c41a", marginBottom: 20 }} />
      <h1 style={{ color: "#389e0d", marginBottom: 8 }}>Thanh toán thành công!</h1>
      <p style={{ color: "#595959", marginBottom: 24 }}>Cảm ơn bạn đã nạp tiền vào ví.</p>
      <a
        href="/owner/mywallet"
        style={{
          display: "inline-block",
          padding: "10px 26px",
          background: "#52c41a",
          color: "#fff",
          borderRadius: 6,
          textDecoration: "none",
          boxShadow: "0 1px 4px rgba(82,196,26,0.22)"
        }}
      >
        Quay lại ví
      </a>
    </div>
      <Footer />
    </div>
  );
}
