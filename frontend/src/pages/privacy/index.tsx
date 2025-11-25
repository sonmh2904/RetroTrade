import React, { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  CreditCard,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Key,
  Lock,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Users,
  Globe,
  Database,
  Settings,
  Info,
  HelpCircle,
  Zap,
  Star,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getActivePrivacy } from "@/services/privacy/privacy.api";

interface PrivacySection {
  icon: keyof typeof IconMap;
  title: string;
  content: string[];
}

interface PolicyData {
  title: string;
  icon: keyof typeof IconMap;
  sections: PrivacySection[];
  effectiveDate?: string;
  version?: string;
  type?: string;
}

type PoliciesData = Record<string, PolicyData>;

const IconMap = {
  Shield,
  FileText,
  CreditCard,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Key,
  Lock,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Users,
  Globe,
  Database,
  Settings,
  Info,
  HelpCircle,
  Zap,
  Star,
} as const;

type IconName = keyof typeof IconMap;
const isString = (v: unknown): v is string => typeof v === "string";
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isString);
const isValidIcon = (i: unknown): i is IconName =>
  typeof i === "string" && i in IconMap;

const isPrivacySection = (obj: unknown): obj is PrivacySection => {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return isString(o.title) && isValidIcon(o.icon) && isStringArray(o.content);
};
const PolicyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("");
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [policiesData, setPoliciesData] = useState<PoliciesData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getActivePrivacy();
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Không thể tải chính sách");
        }

        const { data } = await res.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("Dữ liệu không hợp lệ");
        }

        const mapped: PoliciesData = {};

        Object.entries(data).forEach(([key, raw]) => {
          if (!raw || typeof raw !== "object") return;

          const p = raw as Record<string, unknown>;

          const sections: PrivacySection[] = Array.isArray(p.sections)
            ? p.sections.filter(isPrivacySection)
            : [];

          const icon: IconName = isValidIcon(p.icon) ? p.icon : "FileText";

          mapped[key] = {
            title: isString(p.title) ? p.title : key,
            icon,
            sections,
            effectiveDate: isString(p.effectiveDate)
              ? p.effectiveDate
              : undefined,
            version: isString(p.version) ? p.version : undefined,
            type: key,
          };
        });

        setPoliciesData(mapped);
        if (Object.keys(mapped).length > 0) {
          setActiveTab(Object.keys(mapped)[0]);
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Không thể tải chính sách.");
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  const toggleSection = (i: number) => {
    setExpandedSection(expandedSection === i ? null : i);
  };

  const currentPolicy = activeTab ? policiesData[activeTab] : null;
  const PolicyIcon: LucideIcon | undefined = currentPolicy
    ? IconMap[currentPolicy.icon]
    : undefined;

  const renderContent = (items: string[]) => (
    <div className="space-y-3">
      {items.map((txt, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-2" />
          <p className="text-slate-600 leading-relaxed flex-1 whitespace-pre-wrap">
            {txt}
          </p>
        </div>
      ))}
    </div>
  );

  // ---------- Render states ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (Object.keys(policiesData).length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            Không có chính sách nào khả dụng tại thời điểm này.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Main UI ----------
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-xl mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Chính Sách & Quy Định</h1>
            <p className="text-lg text-indigo-100">
              Cam kết minh bạch, bảo vệ quyền lợi của bạn trong mọi giao dịch
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="bg-white rounded-xl shadow-lg p-2 max-w-3xl mx-auto">
          <div className="flex flex-wrap">
            {Object.entries(policiesData).map(([key, p]) => {
              const Icon = IconMap[p.icon];
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 px-2 font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">{p.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header Card */}
          {currentPolicy && PolicyIcon && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 mb-8 text-white shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <PolicyIcon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{currentPolicy.title}</h2>
                  {currentPolicy.version && (
                    <p className="text-indigo-100 text-sm">
                      Phiên bản {currentPolicy.version}
                    </p>
                  )}
                  {currentPolicy.effectiveDate && (
                    <p className="text-indigo-100 text-sm">
                      Hiệu lực từ{" "}
                      {new Date(currentPolicy.effectiveDate).toLocaleDateString(
                        "vi-VN"
                      )}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-indigo-100">
                Tìm hiểu chi tiết về các quy định và cam kết của chúng tôi
              </p>
            </div>
          )}

          {/* Accordion */}
          <div className="space-y-4">
            {currentPolicy?.sections.length ? (
              currentPolicy.sections.map((sec, idx) => {
                const SecIcon = IconMap[sec.icon];
                const open = expandedSection === idx;

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <button
                      onClick={() => toggleSection(idx)}
                      className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 p-3 rounded-lg">
                          <SecIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800">
                          {sec.title}
                        </h3>
                      </div>
                      {open ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-0 border-t border-slate-100">
                            {renderContent(sec.content)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có nội dung chính sách cho phần này.</p>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="mt-12 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-3">Cần Hỗ Trợ?</h3>
              <p className="text-slate-300 mb-6">
                Liên hệ với chúng tôi nếu bạn có bất kỳ thắc mắc nào về chính
                sách
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:retrotrade131@gmail.com"
                  className="bg-white text-slate-900 px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  retrotrade131@gmail.com
                </a>
                <button className="bg-slate-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors inline-flex items-center justify-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Hotline: 1900-xxxx
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
