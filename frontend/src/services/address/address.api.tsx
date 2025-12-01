export interface Province {
  province_code: number;
  name: string;
}

export interface Ward {
  ward: string;
}

// Lấy danh sách tỉnh/thành phố. Trả về Promise<Province[]>
export const getProvinces = async (): Promise<Province[]> => {
  try {
    const response = await fetch("https://34tinhthanh.com/api/provinces");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching provinces:", error);
    throw error;
  }
};

// Lấy danh sách xã/phường theo mã tỉnh. Trả về Promise<Ward[]>
export const getWardsByProvinceCode = async (
  provinceCode: number
): Promise<Ward[]> => {
  if (!provinceCode || provinceCode <= 0) {
    throw new Error("Invalid province code");
  }

  try {
    const response = await fetch(
      `https://34tinhthanh.com/api/wards?province_code=${provinceCode}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const wardsData = Array.isArray(data) ? data : [];
    return wardsData.map((ward: { ward_name: string }) => ({
      ward: ward.ward_name,
    }));
  } catch (error) {
    console.error("Error fetching wards:", error);
    throw error;
  }
};
