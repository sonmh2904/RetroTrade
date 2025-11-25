import { WarningOutlined } from '@ant-design/icons';
import Header from '@/components/common/header';
import Footer from '@/components/common/footer';

export default function PaymentCancel() {
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
      <WarningOutlined style={{ fontSize: 56, color: "#faad14", marginBottom: 20 }} />
      <h1 style={{ color: "#d4380d", marginBottom: 8 }}>Thanh toán thất bại</h1>
      <p style={{ color: "#595959", marginBottom: 24 }}>Đã có lỗi xảy ra hoặc bạn đã hủy giao dịch.</p>
      <a
        href="/owner/mywallet"
        style={{
          display: "inline-block",
          padding: "10px 26px",
          background: "#1890ff",
          color: "#fff",
          borderRadius: 6,
          textDecoration: "none",
          boxShadow: "0 1px 4px rgba(24,144,255,0.11)"
        }}
      >
         Quay lại ví
      </a>
    </div>
      <Footer />
    </div>
  );
}
