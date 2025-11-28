import type { CartItem } from "@/store/cart/cartReducer";

// Extended CartItem type với các thuộc tính optional cho rental duration
type CartItemWithRentalDuration = CartItem & {
  minRentalDuration?: number;
  maxRentalDuration?: number;
};

export const getExactRentalUnits = (item: CartItemWithRentalDuration): number => {
  if (!item.rentalStartDate || !item.rentalEndDate) return 0;

  const start = new Date(item.rentalStartDate);
  const end = new Date(item.rentalEndDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (totalHours <= 0) return 0;
  const unit = item.priceUnit.toLowerCase().trim();
  if (unit.includes("giờ") || unit.includes("hour")) {
    return totalHours;
  }
  if (unit.includes("ngày") || unit.includes("day")) {
    return totalHours / 24;
  }
  if (unit.includes("tuần") || unit.includes("week")) {
    return totalHours / (24 * 7);
  }
  if (unit.includes("tháng") || unit.includes("month")) {
    return totalHours / (24 * 30.4375);
  }
  return totalHours / 24;
};


export const getBillableUnits = (item: CartItemWithRentalDuration): number => {
  const exact = getExactRentalUnits(item);
  if (exact <= 0) return 0;

  const min = item.minRentalDuration ?? 1;
  const max = item.maxRentalDuration ?? 99999;

  const rounded = Math.ceil(exact);
  
  // Áp dụng min/max constraint
  const result = Math.max(min, Math.min(max, rounded));
  
  return result;
};

/**
 * Lấy tên đơn vị từ priceUnit (giờ, ngày, tuần, tháng)
 * @param priceUnit - Đơn vị giá của sản phẩm
 * @returns Tên đơn vị bằng tiếng Việt
 */
export const getUnitName = (priceUnit: string): string => {
  const unit = priceUnit.toLowerCase().trim();
  
  if (unit.includes("giờ") || unit.includes("hour")) {
    return "giờ";
  }
  if (unit.includes("ngày") || unit.includes("day")) {
    return "ngày";
  }
  if (unit.includes("tuần") || unit.includes("week")) {
    return "tuần";
  }
  if (unit.includes("tháng") || unit.includes("month")) {
    return "tháng";
  }
  
  // Fallback: mặc định là ngày
  return "ngày";
};

/**
 * Kết quả validation thời gian thuê
 */
export interface RentalValidationResult {
  isValid: boolean;
  exactUnits: number;
  min: number;
  max: number;
  unitName: string;
  errorMessage?: string;
  warningMessage?: string;
}

/**
 * Kiểm tra thời gian thuê có hợp lệ không (dựa trên min/max rental duration)
 * @param item - CartItem với rentalStartDate, rentalEndDate, priceUnit, minRentalDuration, maxRentalDuration
 * @returns Kết quả validation chi tiết
 */
export const validateRentalDuration = (
  item: CartItemWithRentalDuration
): RentalValidationResult => {
  const exactUnits = getExactRentalUnits(item);
  const min = item.minRentalDuration ?? 1;
  const max = item.maxRentalDuration ?? 99999;
  const unitName = getUnitName(item.priceUnit);

  const isValid = exactUnits > 0 && exactUnits >= min && exactUnits <= max;

  let errorMessage: string | undefined;
  let warningMessage: string | undefined;

  if (exactUnits <= 0) {
    errorMessage = "Thời gian thuê không hợp lệ";
  } else if (exactUnits < min) {
    errorMessage = `Yêu cầu thuê tối thiểu ${min} ${unitName} (hiện chỉ ${exactUnits.toFixed(1)})`;
  } else if (exactUnits > max) {
    errorMessage = `Chỉ được thuê tối đa ${max} ${unitName}`;
  }

  return {
    isValid,
    exactUnits,
    min,
    max,
    unitName,
    errorMessage,
    warningMessage,
  };
};

/**
 * Kiểm tra thời gian thuê có hợp lệ không (chỉ trả về boolean)
 * @param item - CartItem với rentalStartDate, rentalEndDate, priceUnit, minRentalDuration, maxRentalDuration
 * @returns true nếu hợp lệ, false nếu không hợp lệ
 */
export const isRentalDurationValid = (
  item: CartItemWithRentalDuration
): boolean => {
  return validateRentalDuration(item).isValid;
};

