"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa6";
import router from "next/router";

const aboutLinks = [
  { href: "/about", label: "Giới thiệu RetroTrade" },
  { href: "/blog", label: "Blog & Tin tức" },
  { href: "/products", label: "Danh mục sản phẩm" },
];

const policySupportLinks = [
  { href: "/terms", label: "Điều khoản sử dụng" },
  { href: "/privacy", label: "Chính sách bảo mật" },
  { href: "/auth/messages", label: "Liên hệ hỗ trợ", requiresAuth: true },
];

export function Footer() {
  const router = useRouter();

  const handleProtectedLink = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    // Check if user is logged in (you'll need to implement this check)
    const isLoggedIn = false; // Replace with actual auth check
    
    if (!isLoggedIn) {
      alert('Vui lòng đăng nhập để truy cập trang này');
      // Optionally redirect to login page
      // router.push('/auth/login');
    } else {
      router.push(href);
    }
  };

  return (
    <footer className="relative z-10 bg-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />
      <div className="relative h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-4">
            <div className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Image 
                    src="/retrologo.png" 
                    alt="RetroTrade" 
                    width={64}
                    height={64}
                    className="object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-lg" />
                </div>
                <p className="text-2xl font-bold leading-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">RetroTrade</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed max-w-sm">
                Nền tảng cho thuê đồ cũ và mới, kết nối nhu cầu sử dụng trong đời sống hằng ngày. Giải pháp giúp bạn tiếp cận đa dạng sản phẩm một cách tiện lợi, tiết kiệm và hiệu quả.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <FooterColumn title="Về RetroTrade" links={aboutLinks} />
              <FooterColumn title="Chính sách & Hỗ trợ" links={policySupportLinks} />
              <FooterColumn title="Thông tin liên hệ" isContact={true} />
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} RetroTrade. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  title: string;
  links?: { href: string; label: string }[];
  isContact?: boolean;
};

function FooterColumn({ title, links, isContact }: FooterColumnProps) {
  if (isContact) {
    return (
      <div className="space-y-6">
        <p className="text-lg font-semibold text-white relative group">
          {title}
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 group-hover:w-full" />
        </p>
        <div className="space-y-4 text-sm text-gray-300">
          <div className="flex items-center gap-3 group">
            <Phone className="h-5 w-5 group-hover:text-blue-400 transition-colors" />
            <span className="group-hover:text-white transition-colors">Hotline: 1900-xxxx</span>
          </div>
          <div className="flex items-center gap-3 group">
            <div className="flex items-center justify-center">
              <Mail className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
            </div>
            <a href="mailto:retrotrade131@gmail.com" className="hover:text-white transition-colors">
              retrotrade131@gmail.com
            </a>
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <SocialLink href="https://facebook.com" ariaLabel="Facebook">
            <FaFacebookF />
          </SocialLink>
          <SocialLink href="https://instagram.com" ariaLabel="Instagram">
            <FaInstagram />
          </SocialLink>
          <SocialLink href="https://youtube.com" ariaLabel="YouTube">
            <FaYoutube />
          </SocialLink>
          <SocialLink href="https://tiktok.com" ariaLabel="TikTok">
            <FaTiktok />
          </SocialLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col justify-between">
      <p className="text-base font-semibold text-white relative">
        {title}
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 group-hover:w-full" />
      </p>
      <ul className="space-y-6 text-sm flex-1">
        {links?.map(({ href, label }) => (
          <li key={href} className="group">
            {(href === "/auth/messages") ? (
              <Link
                href="/auth/messages"
                className="text-gray-300 transition-all duration-300 hover:text-white hover:translate-x-2 inline-block"
              >
                {label}
              </Link>
            ) : (
              <Link
                href={href}
                className="text-gray-300 transition-all duration-300 hover:text-white hover:translate-x-2 inline-block"
              >
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type SocialLinkProps = {
  href: string;
  children: React.ReactNode;
  ariaLabel: string;
};

function SocialLink({ href, children, ariaLabel }: SocialLinkProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 text-gray-400 transition-all duration-300 hover:border-white hover:bg-white hover:text-gray-900 hover:scale-110 hover:-translate-y-1"
    >
      {children}
    </a>
  );
}

export default Footer;