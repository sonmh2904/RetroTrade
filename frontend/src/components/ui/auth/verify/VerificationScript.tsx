import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Phone,
  MessageSquare,
  Camera,
  CheckCircle,
  Clock,
  Shield,
  AlertTriangle,
  Play,
  Pause,
  X
} from "lucide-react";

export default function VerificationScript() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const prevOverflowRef = useRef<string>("");
  // Inline quick guide removed per request

  const steps = [
    {
      id: 1,
      icon: Phone,
      title: "Nhập số điện thoại",
      description: "Nhập số điện thoại Việt Nam đang hoạt động",
      details: [
        "Sử dụng số điện thoại có thể nhận SMS",
        "Định dạng: 0123456789 hoặc +84123456789",
        "Đảm bảo điện thoại có tín hiệu mạng"
      ],
      color: "blue",
      estimatedTime: "30 giây"
    },
    {
      id: 2,
      icon: MessageSquare,
      title: "Xác minh mã OTP",
      description: "Nhập mã 6 chữ số từ tin nhắn SMS",
      details: [
        "Kiểm tra tin nhắn SMS trên điện thoại",
        "Nhập đầy đủ 6 chữ số",
        "Mã OTP có hiệu lực trong 5 phút",
        "Có thể dán mã OTP trực tiếp"
      ],
      color: "green",
      estimatedTime: "1 phút"
    },
    {
      id: 3,
      icon: Camera,
      title: "Tải ảnh xác minh",
      description: "Tải lên 2 ảnh: mặt trước và mặt sau CCCD",
      details: [
        "Mặt trước CCCD: rõ nét, đầy đủ thông tin",
        "Mặt sau CCCD: rõ nét, đầy đủ thông tin",
        "Định dạng: JPG, JPEG, PNG (tối đa 5MB)",
        "Đảm bảo ảnh không bị mờ hoặc tối",
        "Hệ thống sẽ tự động đọc thông tin từ ảnh"
      ],
      color: "purple",
      estimatedTime: "3-5 phút"
    },
    {
      id: 4,
      icon: CheckCircle,
      title: "Nhận kết quả",
      description: "Xem kết quả xác minh danh tính",
      details: [
        "Hệ thống sẽ xử lý và xác minh thông tin",
        "Thời gian xử lý: 1-3 phút",
        "Nhận thông báo kết quả thành công/thất bại",
        "Có thể thử lại nếu xác minh thất bại"
      ],
      color: "orange",
      estimatedTime: "1-3 phút"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-50 border-blue-200 text-blue-800",
      green: "bg-green-50 border-green-200 text-green-800",
      purple: "bg-purple-50 border-purple-200 text-purple-800",
      orange: "bg-orange-50 border-orange-200 text-orange-800"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getIconColorClasses = (color: string) => {
    const colors = {
      blue: "text-blue-600",
      green: "text-green-600",
      purple: "text-purple-600",
      orange: "text-orange-600"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Auto-play functionality - Left to Right with Auto-scroll
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isAutoPlaying && isPopupOpen) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = prev + 1;

          // Auto-scroll to current step
          setTimeout(() => {
            const stepElement = document.getElementById(`step-${nextStep}`);
            if (stepElement) {
              stepElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            }
          }, 100); // Small delay to ensure element is rendered

          if (nextStep >= steps.length) {
            setIsAutoPlaying(false);
            setIsPlaying(false);
            return 0;
          }
          return nextStep;
        });
      }, 3000); // Mỗi 3 giây chuyển bước
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying, isPopupOpen, steps.length]);

  // Auto-scroll to first step when starting
  useEffect(() => {
    if (isAutoPlaying && currentStep === 0) {
      setTimeout(() => {
        const stepElement = document.getElementById(`step-1`);
        if (stepElement) {
          stepElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 200);
    }
  }, [isAutoPlaying, currentStep]);

  const handlePlayPause = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setIsPlaying(false);
    } else {
      setIsAutoPlaying(true);
      setIsPlaying(true);
      setIsPopupOpen(true); // Tự động mở popup khi play
      setCurrentStep(0); // Bắt đầu từ bước đầu
    }
  };

  // Prevent background scroll and ensure modal overlays header/footer correctly
  useEffect(() => {
    if (isPopupOpen) {
      prevOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prevOverflowRef.current || '';
    }
    return () => {
      document.body.style.overflow = prevOverflowRef.current || '';
    };
  }, [isPopupOpen]);

  return (
    <>
      {/* Trigger Button */}
      <div className="w-full mb-6">
        <button
          onClick={() => setIsPopupOpen(true)}
          className="w-full bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border border-indigo-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-indigo-800">
                  📋 Hướng dẫn xác minh danh tính
                </h2>
                <p className="text-sm text-indigo-600">
                  Nhấp để xem hướng dẫn chi tiết 4 bước xác minh
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                }}
                className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                title={isPlaying ? "Dừng hướng dẫn tự động" : "Phát hướng dẫn tự động"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Play className="w-5 h-5 text-indigo-600" />
                )}
              </button>
              <ChevronDown className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </button>
      </div>

      {/* Popup Modal */}
      {isPopupOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2147483647] p-4">
          <div className="bg-white rounded-lg w-full max-w-[min(100vw-32px,64rem)] h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Popup Header */}
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border-b border-indigo-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Shield className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-indigo-800">
                      📋 Hướng dẫn xác minh danh tính
                    </h2>
                    <p className="text-sm text-indigo-600">
                      Làm theo 4 bước dưới đây để hoàn tất xác minh
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                    title={isPlaying ? "Dừng hướng dẫn tự động" : "Phát hướng dẫn tự động"}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Play className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsPopupOpen(false)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Đóng hướng dẫn"
                  >
                    <X className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Horizontal Steps Overview */}
              <div className="mt-4 flex justify-between items-center relative">
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  const isCurrentStep = isAutoPlaying && currentStep === index;
                  const isCompleted = isAutoPlaying && currentStep > index;

                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1 relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${isCurrentStep ? 'ring-4 ring-indigo-300 shadow-lg scale-110' :
                          isCompleted ? 'bg-green-100' :
                            step.color === 'blue' ? 'bg-blue-100' :
                              step.color === 'green' ? 'bg-green-100' :
                                step.color === 'purple' ? 'bg-purple-100' :
                                  'bg-orange-100'
                        }`}>
                        <IconComponent className={`w-6 h-6 ${isCompleted ? 'text-green-600' : getIconColorClasses(step.color)
                          }`} />
                      </div>
                      <p className={`text-xs font-medium text-center transition-colors ${isCurrentStep ? 'text-indigo-700 font-bold' : 'text-gray-700'
                        }`}>{step.title}</p>
                      <p className="text-xs text-gray-500">{step.estimatedTime}</p>
                      {isCurrentStep && (
                        <div className="mt-1">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                      {/* Progress line */}
                      {index < steps.length - 1 && (
                        <div className="absolute top-6 left-full w-full h-0.5 bg-gray-300">
                          <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-400 w-full' : 'bg-gray-300 w-0'
                            }`}></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time Estimate */}
              <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/50 rounded-lg">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  ⏱️ Tổng thời gian: 5-10 phút
                </span>
              </div>

              {/* Auto-play Status */}
              {isAutoPlaying && (
                <div className="mt-3 flex items-center justify-center gap-2 p-2 bg-indigo-100 rounded-lg">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-indigo-700">
                    🎬 Đang phát hướng dẫn tự động - Bước {currentStep + 1}/4
                  </span>
                  <span className="text-xs text-indigo-600 ml-2">
                    📍 Đang cuộn đến bước hiện tại...
                  </span>
                </div>
              )}
            </div>

            {/* Popup Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-4">
                {/* Important Notes - Moved to top */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-2">
                        ⚠️ Lưu ý quan trọng
                      </h4>
                      <ul className="space-y-1 text-sm text-yellow-700">
                        <li>• Đảm bảo có kết nối internet ổn định</li>
                        <li>• Chuẩn bị sẵn CCCD và điện thoại</li>
                        <li>• Ảnh phải rõ nét, không bị mờ</li>
                        <li>• Không đóng trình duyệt trong quá trình xác minh</li>
                        <li>• Liên hệ hỗ trợ nếu gặp vấn đề</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                {steps.map((step) => {
                  const IconComponent = step.icon;
                  const isCurrentStep = isAutoPlaying && currentStep === step.id - 1;
                  return (
                    <div
                      key={step.id}
                      id={`step-${step.id}`}
                      className={`border rounded-lg p-4 transition-all duration-500 ${isCurrentStep ? 'ring-2 ring-indigo-400 shadow-lg scale-[1.02]' : ''
                        } ${getColorClasses(step.color)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg relative ${step.color === 'blue' ? 'bg-blue-100' :
                            step.color === 'green' ? 'bg-green-100' :
                              step.color === 'purple' ? 'bg-purple-100' :
                                'bg-orange-100'
                          }`}>
                          <IconComponent className={`w-5 h-5 ${getIconColorClasses(step.color)}`} />
                          {isCurrentStep && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              Bước {step.id}: {step.title}
                            </h3>
                            <span className="text-xs bg-white/50 px-2 py-1 rounded">
                              {step.estimatedTime}
                            </span>
                          </div>
                          <p className="text-sm mb-3 opacity-90">
                            {step.description}
                          </p>
                          <ul className="space-y-1">
                            {step.details.map((detail, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="text-xs mt-1">•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        typeof window !== 'undefined' ? document.body : (undefined as unknown as Element)
      )}
    </>
  );
}