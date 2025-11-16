
function getTimeUnitInDays(unitId) {
  const units = { 1: 1 / 24, 2: 1, 3: 7, 4: 30 };
  return units[unitId] ?? 1;
}

function calculateDurationInUnit(startAt, endAt, unitId) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const diffMs = end - start;
  if (diffMs <= 0) return 0;

  const unitInDays = getTimeUnitInDays(unitId);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.ceil(diffDays / unitInDays);
}

function getUnitName(unitId) {
  const names = { 1: "giờ", 2: "ngày", 3: "tuần", 4: "tháng" };
  return names[unitId] || "ngày";
}

module.exports.calculateTotals = async function (
  item,
  quantity = 1,
  startAt,
  endAt
) {
  console.log("calculateTotals INPUT:", {
    itemId: item._id,
    quantity,
    startAt,
    endAt,
  });

  try {
    const priceUnitId = Number(item.PriceUnitId);
    const basePrice = Number(item.BasePrice);
    const depositPerUnit = Number(item.DepositAmount) || 0;

    if (!priceUnitId || !basePrice || quantity < 1) {
      throw new Error("Invalid input");
    }

    // Lấy serviceFee rate từ database
    const ServiceFee = require("../../models/ServiceFee.model");
    const serviceFeeRate = await ServiceFee.getCurrentServiceFeeRate();

    const duration = calculateDurationInUnit(startAt, endAt, priceUnitId);
    if (duration <= 0) throw new Error("Invalid date range");

    const rentalAmount = basePrice * duration * quantity;
    const depositAmount = depositPerUnit * quantity;
    // Tính serviceFee trên (tiền thuê + tiền cọc) theo yêu cầu mới
    const serviceFee = (rentalAmount + depositAmount) * (serviceFeeRate / 100);

    const unitName = getUnitName(priceUnitId);

    console.log("calculateTotals SUCCESS:", {
      duration,
      rentalAmount,
      depositAmount,
      serviceFeeRate,
      serviceFee,
      unitName,
    });

    return {
      rentalAmount: Math.round(rentalAmount),
      serviceFee: Math.round(serviceFee),
      depositAmount: Math.round(depositAmount),
      duration,
      unitName, 
    };
  } catch (error) {
    console.error("calculateTotals FAILED:", error.message);
    return null;
  }
};
