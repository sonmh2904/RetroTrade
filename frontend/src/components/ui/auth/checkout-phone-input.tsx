"use client";

import React, { useState, useEffect, useRef } from "react";

interface CheckoutPhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  defaultPhone?: string;
  onValidationChange?: (isValid: boolean, error: string) => void;
}

// Validate số điện thoại Việt Nam
const validateVietnamesePhone = (phone: string): string => {
  if (!phone) {
    return "Vui lòng nhập số điện thoại";
  }

  // Chỉ cho phép số
  const phoneDigits = phone.replace(/\D/g, "");

  if (phoneDigits.length === 0) {
    return "Số điện thoại chỉ được chứa số";
  }

  // Kiểm tra độ dài tối đa 10 số
  if (phoneDigits.length > 10) {
    return "Số điện thoại tối đa 10 số";
  }

  // Kiểm tra định dạng số điện thoại Việt Nam
  if (phoneDigits.length === 10) {
    // Phải bắt đầu bằng 0
    if (!phoneDigits.startsWith("0")) {
      return "Số điện thoại Việt Nam phải bắt đầu bằng số 0";
    }

    // Kiểm tra đầu số hợp lệ
    const validPrefixes = ["03", "05", "07", "08", "09", "02"];
    const prefix = phoneDigits.substring(0, 2);

    if (!validPrefixes.includes(prefix)) {
      return "Đầu số không hợp lệ. Số điện thoại Việt Nam phải bắt đầu bằng: 03, 05, 07, 08, 09 (di động) hoặc 02 (cố định)";
    }
  }

  return "";
};

export function CheckoutPhoneInput({
  value,
  onChange,
  defaultPhone = "",
  onValidationChange,
}: CheckoutPhoneInputProps) {
  const [useDefaultPhone, setUseDefaultPhone] = useState(true);
  const [phoneError, setPhoneError] = useState<string>("");
  const prevUseDefaultPhoneRef = useRef<boolean>(true);

  // Xử lý thay đổi số điện thoại
  const handlePhoneChange = (inputValue: string) => {
    // Chỉ cho phép nhập số
    const phoneDigits = inputValue.replace(/\D/g, "");

    // Giới hạn tối đa 10 số
    const limitedPhone = phoneDigits.slice(0, 10);

    onChange(limitedPhone);

    // Validate khi người dùng nhập
    if (limitedPhone.length > 0) {
      const error = validateVietnamesePhone(limitedPhone);
      setPhoneError(error);
      onValidationChange?.(!error, error);
    } else {
      setPhoneError("");
      onValidationChange?.(false, "");
    }
  };

  // Update phone when useDefaultPhone changes (chỉ khi thực sự thay đổi)
  useEffect(() => {
    const prevUseDefaultPhone = prevUseDefaultPhoneRef.current;

    // Chỉ xử lý khi useDefaultPhone thực sự thay đổi
    if (useDefaultPhone !== prevUseDefaultPhone) {
      if (useDefaultPhone && defaultPhone) {
        // Chuyển sang dùng số mặc định
        onChange(defaultPhone);
        setPhoneError("");
        const error = validateVietnamesePhone(defaultPhone);
        onValidationChange?.(!error, error);
      } else if (!useDefaultPhone && prevUseDefaultPhone) {
        // Chuyển sang nhập số mới - chỉ clear khi chuyển từ default sang custom
        onChange("");
        setPhoneError("");
        onValidationChange?.(false, "");
      }
      prevUseDefaultPhoneRef.current = useDefaultPhone;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDefaultPhone, defaultPhone]);

  // Sync với defaultPhone khi đang dùng default
  useEffect(() => {
    if (useDefaultPhone && defaultPhone && value !== defaultPhone) {
      onChange(defaultPhone);
      setPhoneError("");
      const error = validateVietnamesePhone(defaultPhone);
      onValidationChange?.(!error, error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPhone, useDefaultPhone]);

  // Validate on blur
  const handleBlur = () => {
    if (value) {
      const error = validateVietnamesePhone(value);
      setPhoneError(error);
      onValidationChange?.(!error, error);
    }
  };

  return (
    <div>
      {/* Phone Options */}
      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="phoneOption"
            checked={useDefaultPhone}
            onChange={() => setUseDefaultPhone(true)}
            className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">
            Dùng số mặc định
            {defaultPhone && (
              <span className="ml-2 text-emerald-600 font-medium">
                ({defaultPhone})
              </span>
            )}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="phoneOption"
            checked={!useDefaultPhone}
            onChange={() => setUseDefaultPhone(false)}
            className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">Nhập số mới</span>
        </label>
      </div>

      {/* Phone Input */}
      {useDefaultPhone ? (
        <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base text-gray-700">
          {defaultPhone || "Đang tải số điện thoại..."}
        </div>
      ) : (
        <div>
          <input
            type="tel"
            placeholder="Nhập số điện thoại (VD: 0912345678)"
            className={`w-full px-4 py-3 text-base border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-sm hover:border-gray-300 ${
              phoneError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-200"
            }`}
            value={value}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handleBlur}
            maxLength={10}
          />
          {phoneError && (
            <p className="text-sm text-red-600 mt-1">{phoneError}</p>
          )}
          {!phoneError && value && value.length === 10 && (
            <p className="text-sm text-emerald-600 mt-1">
              ✓ Số điện thoại hợp lệ
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Export validation function for use in parent component
export { validateVietnamesePhone };
