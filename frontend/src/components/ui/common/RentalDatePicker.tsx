'use client';

import { Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getPublicItemById } from "@/services/products/product.api";

interface ProductInfo {
  MinRentalDuration?: number;
  MaxRentalDuration?: number;
  PriceUnitId?: number;
  PriceUnit?: {
    UnitName?: string;
  };
}

interface RentalDatePickerProps {
  rentalStartDate: string;
  rentalEndDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startDateError?: string;
  endDateError?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  itemId?: string;
}

export default function RentalDatePicker({
  rentalStartDate,
  rentalEndDate,
  onStartDateChange,
  onEndDateChange,
  startDateError,
  endDateError,
  disabled = false,
  size = 'md',
  showLabel = true,
  className = '',
  itemId,
}: RentalDatePickerProps) {
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [durationError, setDurationError] = useState<string>('');
  const [showMaxDurationModal, setShowMaxDurationModal] = useState(false);
  const [maxEndDate, setMaxEndDate] = useState<string>('');

  // Fetch product info when itemId is provided
  useEffect(() => {
    if (!itemId) {
      setProductInfo(null);
      setDurationError('');
      return;
    }

    const fetchProduct = async () => {
      try {
        const response = await getPublicItemById(itemId);
        const data = response?.data ?? response;
        setProductInfo(data);
      } catch (error) {
        console.error('Error fetching product info:', error);
        setProductInfo(null);
      }
    };

    fetchProduct();
  }, [itemId]);

  // Calculate duration in product's unit
  const calculateDurationInUnit = (startAt: string, endAt: string, unitId: number): number => {
    if (!startAt || !endAt) return 0;
    const start = new Date(startAt);
    const end = new Date(endAt);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;

    // Map unitId to days: 1=hour(1/24), 2=day(1), 3=week(7), 4=month(30)
    const unitInDays: { [key: number]: number } = {
      1: 1 / 24,
      2: 1,
      3: 7,
      4: 30,
    };
    const unitInDaysValue = unitInDays[unitId] ?? 1;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.ceil(diffDays / unitInDaysValue);
  };

  // Calculate max end date based on start date and max duration
  const calculateMaxEndDate = (startDate: string, maxDuration: number, unitId: number): string => {
    if (!startDate || !maxDuration) return '';
    const start = new Date(startDate);
    
    // Map unitId to milliseconds: 1=hour, 2=day, 3=week, 4=month
    const unitInMs: { [key: number]: number } = {
      1: 60 * 60 * 1000, // 1 hour in ms
      2: 24 * 60 * 60 * 1000, // 1 day in ms
      3: 7 * 24 * 60 * 60 * 1000, // 1 week in ms
      4: 30 * 24 * 60 * 60 * 1000, // 1 month in ms (approximate)
    };
    const unitInMsValue = unitInMs[unitId] ?? 24 * 60 * 60 * 1000;
    
    const maxEnd = new Date(start.getTime() + maxDuration * unitInMsValue);
    return maxEnd.toISOString();
  };

  // Handle end date change with validation
  const handleEndDateChange = (value: string) => {
    if (!value || !productInfo || !rentalStartDate) {
      // Convert datetime-local to ISO if needed
      if (value && value.includes("T") && !value.includes("Z") && value.length === 16) {
        const date = new Date(value);
        onEndDateChange(date.toISOString());
      } else {
        onEndDateChange(value);
      }
      return;
    }

    const priceUnitId = productInfo.PriceUnitId || 2;
    const maxDuration = productInfo.MaxRentalDuration;

    if (maxDuration) {
      // Convert datetime-local to Date object
      const selectedEnd = new Date(value);
      const maxEnd = new Date(calculateMaxEndDate(rentalStartDate, maxDuration, priceUnitId));
      
      if (selectedEnd > maxEnd) {
        // Show modal and adjust to max date
        setMaxEndDate(maxEnd.toISOString());
        setShowMaxDurationModal(true);
        // Auto-adjust to max date (return ISO string)
        onEndDateChange(maxEnd.toISOString());
      } else {
        // Convert datetime-local to ISO if needed
        if (value.includes("T") && !value.includes("Z") && value.length === 16) {
          const date = new Date(value);
          onEndDateChange(date.toISOString());
        } else {
          onEndDateChange(value);
        }
      }
    } else {
      // Convert datetime-local to ISO if needed
      if (value.includes("T") && !value.includes("Z") && value.length === 16) {
        const date = new Date(value);
        onEndDateChange(date.toISOString());
      } else {
        onEndDateChange(value);
      }
    }
  };

  // Handle start date change - convert datetime-local to ISO
  const handleStartDateChange = (value: string) => {
    if (!value) {
      onStartDateChange(value);
      return;
    }
    // Convert datetime-local to ISO if needed
    if (value.includes("T") && !value.includes("Z") && value.length === 16) {
      const date = new Date(value);
      onStartDateChange(date.toISOString());
    } else {
      onStartDateChange(value);
    }
  };

  // Validate duration against product constraints
  useEffect(() => {
    if (!productInfo || !rentalStartDate || !rentalEndDate) {
      setDurationError('');
      return;
    }

    const priceUnitId = productInfo.PriceUnitId || 2; // Default to days
    const duration = calculateDurationInUnit(rentalStartDate, rentalEndDate, priceUnitId);

    const minDuration = productInfo.MinRentalDuration;
    const maxDuration = productInfo.MaxRentalDuration;
    const unitName = productInfo.PriceUnit?.UnitName?.toLowerCase() || 'ngày';

    let error = '';
    if (minDuration && duration < minDuration) {
      error = `Thời gian thuê tối thiểu là ${minDuration} ${unitName}`;
    } else if (maxDuration && duration > maxDuration) {
      error = `Thời gian thuê tối đa là ${maxDuration} ${unitName}`;
    }

    setDurationError(error);
  }, [productInfo, rentalStartDate, rentalEndDate]);

  // Get minimum datetime (current time - 5 minutes buffer)
  const getMinDateTime = (): string => {
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    const minTime = new Date(now.getTime() - bufferTime);
    return minTime.toISOString().substring(0, 16);
  };

  // Format date to datetime-local input format
  const formatDateTimeLocal = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Calendar className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'} text-emerald-600`} />
          <span className={`font-medium text-gray-700 ${labelSizeClasses[size]}`}>
            Thời gian thuê:
          </span>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          {showLabel && (
            <label className={`block font-semibold text-gray-700 mb-2 ${labelSizeClasses[size]}`}>
              Ngày bắt đầu <span className="text-red-500">*</span>
            </label>
          )}
          <input
            type="datetime-local"
            value={rentalStartDate ? formatDateTimeLocal(rentalStartDate) : ''}
            onChange={(e) => handleStartDateChange(e.target.value)}
            min={getMinDateTime()}
            disabled={disabled}
            className={`w-full border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
              startDateError
                ? "border-red-300 bg-red-50"
                : "border-gray-300 hover:border-gray-400"
            } ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {startDateError && (
            <p className={`mt-1 text-red-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {startDateError}
            </p>
          )}
        </div>
        
        <div>
          {showLabel && (
            <label className={`block font-semibold text-gray-700 mb-2 ${labelSizeClasses[size]}`}>
              Ngày kết thúc <span className="text-red-500">*</span>
            </label>
          )}
          <input
            type="datetime-local"
            value={rentalEndDate ? formatDateTimeLocal(rentalEndDate) : ''}
            onChange={(e) => handleEndDateChange(e.target.value)}
            min={rentalStartDate ? formatDateTimeLocal(rentalStartDate) : getMinDateTime()}
            max={productInfo?.MaxRentalDuration && rentalStartDate 
              ? formatDateTimeLocal(calculateMaxEndDate(rentalStartDate, productInfo.MaxRentalDuration, productInfo.PriceUnitId || 2))
              : undefined
            }
            disabled={disabled}
            className={`w-full border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
              endDateError
                ? "border-red-300 bg-red-50"
                : "border-gray-300 hover:border-gray-400"
            } ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {endDateError && (
            <p className={`mt-1 text-red-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {endDateError}
            </p>
          )}
        </div>
      </div>
      
      {rentalStartDate && rentalEndDate && !startDateError && !endDateError && (
        <div className={`text-gray-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <span className="font-medium">
            {format(new Date(rentalStartDate), "dd/MM/yyyy HH:mm")} → {format(new Date(rentalEndDate), "dd/MM/yyyy HH:mm")}
          </span>
        </div>
      )}

      {/* Duration validation error */}
      {durationError && (
        <div className={`mt-2 p-2 bg-red-50 border border-red-200 rounded-lg ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <p className="text-red-600 font-medium">{durationError}</p>
        </div>
      )}

      {/* Product rental duration info */}
      {productInfo && (productInfo.MinRentalDuration || productInfo.MaxRentalDuration) && (
        <div className={`mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <p className="text-blue-700">
            <span className="font-medium">Quy định thuê:</span>{' '}
            {productInfo.MinRentalDuration && (
              <span>Tối thiểu {productInfo.MinRentalDuration} {productInfo.PriceUnit?.UnitName?.toLowerCase() || 'ngày'}</span>
            )}
            {productInfo.MinRentalDuration && productInfo.MaxRentalDuration && ' • '}
            {productInfo.MaxRentalDuration && (
              <span>Tối đa {productInfo.MaxRentalDuration} {productInfo.PriceUnit?.UnitName?.toLowerCase() || 'ngày'}</span>
            )}
          </p>
        </div>
      )}

      {/* Max Duration Modal */}
      {showMaxDurationModal && productInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMaxDurationModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md mx-auto bg-amber-50 rounded-2xl shadow-2xl border-2 border-amber-200 transform transition-all duration-300 scale-100 opacity-100">
            {/* Close button */}
            <button
              onClick={() => setShowMaxDurationModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-amber-100 rounded-full transition-colors"
            >
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </button>

            {/* Content */}
            <div className="p-8 text-center">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-amber-500" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-amber-900 mb-3">
                Thời gian thuê vượt quá quy định
              </h3>

              {/* Message */}
              <p className="text-amber-700 mb-4">
                Thời gian thuê tối đa cho sản phẩm này là{' '}
                <span className="font-semibold">
                  {productInfo.MaxRentalDuration} {productInfo.PriceUnit?.UnitName?.toLowerCase() || 'ngày'}
                </span>.
                <br />
                <br />
                Ngày kết thúc đã được tự động điều chỉnh về{' '}
                <span className="font-semibold">
                  {maxEndDate ? format(new Date(maxEndDate), "dd/MM/yyyy HH:mm") : ''}
                </span>.
              </p>

              {/* Button */}
              <button
                onClick={() => setShowMaxDurationModal(false)}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

