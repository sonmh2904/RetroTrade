const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function generatePDF({
  content,
  title = "Contract",
  outputDir = "./uploads/contracts/",
  returnBuffer = false,
  signatures = [],
}) {
  const footerIndex = content.toLowerCase().indexOf("<table");
  let mainContent = content;
  let footerContent = "";

  if (footerIndex !== -1) {
    mainContent = content.substring(0, footerIndex);
    footerContent = content.substring(footerIndex);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Times New Roman', Times, serif !important; 
          font-size: 14px !important; 
          line-height: 1.6 !important; 
          word-break: break-word !important; 
          hyphens: auto !important; 
          margin: 0; 
          padding: 50px; 
          background: white; 
          color: black; 
          width: 100%; 
          min-height: 100vh; 
          overflow: visible; 
          position: relative;
        }
        pre { 
          white-space: pre-wrap !important; 
          margin: 0; 
          padding: 0; 
          font-family: inherit !important; 
          font-size: inherit !important; 
          line-height: inherit !important; 
          letter-spacing: 0.025em;
          page-break-inside: avoid;
        }
        /* Footer giống hệt FE (ảnh thứ 2 bạn gửi) */
        table {
          width: 100%;
          max-width: 800px;
          border-collapse: collapse;
          margin-top: 150px; /* Khoảng cách lớn để xuống dòng tự nhiên */
        }
        td {
          width: 50%;
          text-align: left;
          vertical-align: top;
          padding: 0;
        }
        strong {
          display: block;
          margin-bottom: 10px;
        }
        /* Khoảng trống lớn sau "Ký tên (hoặc ký điện tử):" nhờ <br><br><br> trong content */
        /* Chữ ký chồng lên đúng vị trí (không có khung viền trong footer HTML) */
        .overlay-signature {
          position: absolute;
          object-fit: contain;
          width: 150px; /* kích thước chữ ký giống FE */
          height: auto;
          pointer-events: none;
        }
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @page { size: A4; margin: 50px; }
      </style>
    </head>
    <body>
      <pre>${escapeHtmlForPDF(mainContent)}</pre>

      <!-- Footer render trực tiếp → xuống dòng nhờ <br><br><br> trong content -->
      ${footerContent}

      <!-- Chồng chữ ký lên (vì không có trong footer HTML) -->
      ${signatures
        .map(
          (sig, index) => `
        <img src="${sig.imageUrl}" class="overlay-signature" style="left: ${sig.positionX}%; top: ${sig.positionY}%;" />
      `
        )
        .join("")}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
    ],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "50px", right: "50px", bottom: "50px", left: "50px" },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });

  await browser.close();

  if (returnBuffer) return pdfBuffer;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `${title.replace(/[^a-z0-9]/gi, "_")}_${uuidv4().slice(
    0,
    8
  )}.pdf`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, pdfBuffer);

  return filePath;
}

function escapeHtmlForPDF(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { generatePDF };
