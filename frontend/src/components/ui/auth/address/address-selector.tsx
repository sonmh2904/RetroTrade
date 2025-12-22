import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { MapPin, Edit2, Trash2, Check, X, Plus, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import {
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  type UserAddress,
} from '@/services/auth/userAddress.api';
import {
  getProvinces,
  getWardsByProvinceCode,
  type Province,
  type Ward,
} from '@/services/address/address.api';

type AddressSelectorProps = {
  selectedAddressId?: string | null;
  onSelect?: (address: UserAddress) => void;
  className?: string;
};

export function AddressSelector({ selectedAddressId: controlledSelectedId, onSelect, className }: AddressSelectorProps) {
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(controlledSelectedId ?? null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({ Address: '', City: '', District: '', IsDefault: false });
  const [addressLoading, setAddressLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  // Address API states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState<number>(0);
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const [, setAddressesLoading] = useState(false);

  useEffect(() => {
    if (controlledSelectedId !== undefined) {
      setSelectedAddressId(controlledSelectedId);
    }
  }, [controlledSelectedId]);

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await getUserAddresses();
      if (Array.isArray(res?.data)) {
        setUserAddresses(res.data);
        if (!controlledSelectedId) {
          const def = res.data.find(a => a.IsDefault) ?? res.data[0] ?? null;
          setSelectedAddressId(def?._id ?? null);
          if (def && onSelect) onSelect(def);
        }
      }
    } catch {
      toast.error('Không thể tải danh sách địa chỉ');
    } finally {
      setAddressesLoading(false);
    }
  };

  const fetchProvinces = useCallback(async () => {
    try {
      const data = await getProvinces();
      setProvinces(data);
    } catch (error) {
      console.error("Error fetching provinces:", error);
      toast.error("Không thể tải danh sách tỉnh/thành phố");
      setProvinces([]);
    }
  }, []);

  const loadWards = useCallback(async (code: number) => {
    if (code <= 0) {
      setWards([]);
      setDistrictSearchTerm('');
      return;
    }
    setDistrictLoading(true);
    try {
      const wardsData = await getWardsByProvinceCode(code);
      setWards(wardsData);
      // If existing district doesn't match any ward, keep as free text
      if (newAddress.District && !wardsData.some((ward) => ward.ward === newAddress.District)) {
        setDistrictSearchTerm(newAddress.District);
      }
    } catch (error) {
      console.error("Error loading wards:", error);
      toast.error("Không thể tải danh sách xã/phường");
      setWards([]);
    } finally {
      setDistrictLoading(false);
    }
  }, [newAddress.District]);

  useEffect(() => {
    fetchProvinces();
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set provinceCode when City changes
  useEffect(() => {
    if (newAddress.City && provinces.length > 0) {
      const selectedProvince = provinces.find((p) => p.name === newAddress.City);
      if (selectedProvince) {
        setProvinceCode(selectedProvince.province_code);
      } else {
        setProvinceCode(0);
      }
    } else {
      setProvinceCode(0);
    }
  }, [newAddress.City, provinces]);

  // Load wards when provinceCode changes
  useEffect(() => {
    loadWards(provinceCode);
  }, [provinceCode, loadWards]);

  // Sync districtSearchTerm with district
  useEffect(() => {
    setDistrictSearchTerm(newAddress.District);
  }, [newAddress.District]);

  // Handle outside click for district dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        districtDropdownRef.current &&
        !districtDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDistrictDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = userAddresses.find(a => a._id === addressId);
    if (address && onSelect) onSelect(address);
    setIsEditingAddress(false);
    setEditingAddressId(null);
  };

  const handleCreateAddress = async () => {
    if (!newAddress.Address || !newAddress.City || !newAddress.District) {
      toast.error('Vui lòng điền đầy đủ thông tin địa chỉ');
      return;
    }
    setAddressLoading(true);
    try {
      const response = await createUserAddress(newAddress);
      if (response?.data) {
        // Optimistically select the newly created address
        const created = response.data as UserAddress;
        if (created?._id) {
          setSelectedAddressId(created._id);
          if (onSelect) onSelect(created);
        }
        await loadAddresses();
        setNewAddress({ Address: '', City: '', District: '', IsDefault: true });
        setIsEditingAddress(false);
        toast.success('Tạo địa chỉ thành công');
      } else {
        toast.error(response?.message || 'Có lỗi xảy ra khi tạo địa chỉ');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi tạo địa chỉ');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleUpdateAddress = async (addressId: string) => {
    const addr = userAddresses.find(a => a._id === addressId);
    if (!addr) return;
    const updateData = {
      Address: newAddress.Address || addr.Address,
      City: newAddress.City || addr.City,
      District: newAddress.District || addr.District,
      IsDefault: newAddress.IsDefault,
    };
    setAddressLoading(true);
    try {
      const response = await updateUserAddress(addressId, updateData);
      if (response?.data) {
        await loadAddresses();
        setNewAddress({ Address: '', City: '', District: '', IsDefault: true });
        setIsEditingAddress(false);
        setEditingAddressId(null);
        toast.success('Cập nhật địa chỉ thành công');
      } else {
        toast.error(response?.message || 'Có lỗi xảy ra khi cập nhật địa chỉ');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi cập nhật địa chỉ');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const response = await deleteUserAddress(addressId);
      if (response?.code === 200 || response?.code === 201) {
        toast.success('Xóa địa chỉ thành công');
        await loadAddresses();
        if (selectedAddressId === addressId) {
          setSelectedAddressId(null);
        }
      } else {
        toast.error(response?.message || 'Có lỗi xảy ra khi xóa địa chỉ');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi xóa địa chỉ');
    }
  };

  const startEditingAddress = (addressId: string) => {
    const address = userAddresses.find(a => a._id === addressId);
    if (address) {
      setEditingAddressId(addressId);
      setNewAddress({ 
        Address: address.Address || '', 
        City: address.City || '', 
        District: address.District || '', 
        IsDefault: address.IsDefault || false 
      });
      setIsEditingAddress(true);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const selectedProvince = provinces.find((p) => p.name === selectedName);
    setNewAddress(prev => ({ ...prev, City: selectedName }));
    setProvinceCode(selectedProvince ? selectedProvince.province_code : 0);
    setNewAddress(prev => ({ ...prev, District: '' }));
    setDistrictSearchTerm('');
  };

  // Searchable dropdown functions for wards
  const filteredWards = wards.filter((ward) =>
    ward.ward.toLowerCase().includes(districtSearchTerm.toLowerCase())
  );

  const handleDistrictInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setDistrictSearchTerm(value);
    if (!showDistrictDropdown) {
      setShowDistrictDropdown(true);
    }
  };

  const handleDistrictFocus = () => {
    if (wards.length > 0 && !showDistrictDropdown) {
      setShowDistrictDropdown(true);
    }
  };

  const selectDistrict = (wardName: string) => {
    setNewAddress(prev => ({ ...prev, District: wardName }));
    setDistrictSearchTerm(wardName);
    setShowDistrictDropdown(false);
  };

  const handleDistrictKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowDistrictDropdown(false);
    } else if (
      e.key === "Enter" &&
      showDistrictDropdown &&
      filteredWards.length > 0
    ) {
      selectDistrict(filteredWards[0].ward);
    }
  };

  // Tách địa chỉ default và các địa chỉ khác
  const { defaultAddress, otherAddresses } = useMemo(() => {
    const defaultAddr = userAddresses.find(a => a.IsDefault) || null;
    const others = userAddresses.filter(a => !a.IsDefault);
    return { defaultAddress: defaultAddr, otherAddresses: others };
  }, [userAddresses]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt của bạn không hỗ trợ lấy vị trí");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=vi`,
            {
              headers: {
                "User-Agent": "RetroTrade/1.0 (+https://retrotrade.vn)",
              },
            }
          );

          if (!res.ok) throw new Error("Không kết nối được dịch vụ địa chỉ");

          const data = await res.json();
          if (!data?.address) {
            toast.error("Không tìm thấy địa chỉ từ vị trí này");
            return;
          }

          const a = data.address;

          // xử lý tỉnh thành phố
          const rawCity =
            a.city || a.state || a.province || a.town || a.municipality || "";

          const normalizedCity = rawCity.replace(/^Thành phố\s+/i, "").trim();

          // Tìm trong danh sách tỉnh đã load từ API
          const matchedProvince = provinces.find(
            (p) =>
              p.name.includes(normalizedCity) ||
              normalizedCity.includes(p.name) ||
              (p.name === "Hà Nội" && normalizedCity.includes("Hà Nội")) ||
              (p.name === "Hồ Chí Minh" &&
                normalizedCity.includes("Hồ Chí Minh")) ||
              (p.name === "Đà Nẵng" && normalizedCity.includes("Đà Nẵng")) ||
              (p.name === "Cần Thơ" && normalizedCity.includes("Cần Thơ")) ||
              (p.name === "Hải Phòng" && normalizedCity.includes("Hải Phòng"))
          );

          // Đường + số nhà
          const houseNumber = a.house_number || "";
          const road = a.road || a.street || a.pedestrian || "";
          const fullStreet = [houseNumber, road]
            .filter(Boolean)
            .join(" ")
            .trim();

          // Phường/xã
          const ward =
            a.suburb ||
            a.neighbourhood ||
            a.quarter ||
            a.village ||
            a.city_district ||
            a.district ||
            "";

          // Cập nhật form
          setNewAddress((prev) => ({
            ...prev,
            Address: fullStreet || prev.Address,
            District: ward || prev.District,
            City: matchedProvince?.name || rawCity || prev.City, 
            IsDefault: true,
          }));

          toast.success("Đã lấy địa chỉ hiện tại thành công!");
        } catch (err) {
          console.error("Lỗi lấy địa chỉ:", err);
          toast.error("Không thể lấy địa chỉ. Vui lòng nhập tay.");
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        let msg = "Không thể lấy vị trí hiện tại.";
        if (err.code === GeolocationPositionError.PERMISSION_DENIED)
          msg = "Bạn chưa cho phép truy cập vị trí";
        else if (err.code === GeolocationPositionError.POSITION_UNAVAILABLE)
          msg = "Không xác định được vị trí";
        else if (err.code === GeolocationPositionError.TIMEOUT)
          msg = "Hết thời gian chờ vị trí";

        toast.error(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-700">Chọn địa chỉ đã lưu</label>
        <button
          onClick={() => { 
            setIsEditingAddress(true); 
            setEditingAddressId(null); 
            setNewAddress({ Address: '', City: '', District: '', IsDefault: true }); 
            setProvinceCode(0);
            setDistrictSearchTerm('');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm mới
        </button>
      </div>

      {(isEditingAddress || editingAddressId) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingAddressId ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
            <button
              onClick={() => { 
                setIsEditingAddress(false); 
                setEditingAddressId(null); 
                setNewAddress({ Address: '', City: '', District: '', IsDefault: true }); 
                setProvinceCode(0);
                setDistrictSearchTerm('');
              }}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-700">Địa chỉ (số nhà, đường...)</label>
                <button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Lấy địa chỉ hiện tại từ vị trí GPS"
                >
                  {locationLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang lấy...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lấy địa chỉ hiện tại</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                placeholder="Nhập địa chỉ chi tiết"
                value={newAddress.Address}
                onChange={(e) => setNewAddress({ ...newAddress, Address: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tỉnh/Thành phố</label>
                <select
                  value={newAddress.City}
                  onChange={handleCityChange}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-black"
                >
                  <option value="">Chọn tỉnh/thành phố</option>
                  {provinces.map((province) => (
                    <option key={province.province_code} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phường/Xã</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="text"
                      value={districtSearchTerm}
                      onChange={handleDistrictInputChange}
                      onFocus={handleDistrictFocus}
                      onKeyDown={handleDistrictKeyDown}
                      disabled={!newAddress.City || districtLoading}
                      placeholder="Tìm kiếm xã/phường"
                      className="w-full pl-10 pr-10 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {districtLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-emerald-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Đang tải</span>
                      </div>
                    )}
                  </div>
                  {showDistrictDropdown && wards.length > 0 && (
                    <div
                      ref={districtDropdownRef}
                      className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto mt-1"
                    >
                      {filteredWards.length > 0 ? (
                        filteredWards.map((ward, idx) => (
                          <div
                            key={idx}
                            className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-black"
                            onClick={() => selectDistrict(ward.ward)}
                          >
                            {ward.ward}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-500 text-center">
                          Không tìm thấy kết quả
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {newAddress.City && wards.length === 0 && !districtLoading && (
                  <p className="text-xs text-gray-500 mt-1">
                    Không có dữ liệu xã/phường cho tỉnh này.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={newAddress.IsDefault}
                onChange={(e) => setNewAddress({ ...newAddress, IsDefault: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700 cursor-pointer">Đặt làm địa chỉ mặc định</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (editingAddressId) { handleUpdateAddress(editingAddressId); } else { handleCreateAddress(); } }}
                disabled={addressLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addressLoading ? 'Đang xử lý...' : editingAddressId ? 'Cập nhật' : 'Thêm mới'}
              </button>
              <button
                onClick={() => { 
                  setIsEditingAddress(false); 
                  setEditingAddressId(null); 
                  setNewAddress({ Address: '', City: '', District: '', IsDefault: true }); 
                  setProvinceCode(0);
                  setDistrictSearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Hiển thị địa chỉ default */}
        {defaultAddress && (
          <div
            className={`relative p-4 border-2 rounded-xl transition-all cursor-pointer ${
              selectedAddressId === defaultAddress._id ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => handleAddressSelect(defaultAddress._id)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                {selectedAddressId === defaultAddress._id ? (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 border-2 border-emerald-600 flex-shrink-0 cursor-pointer">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 cursor-pointer"></div>
                )}
              </div>
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">Mặc định</span>
              <div className="flex-1"></div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditingAddress(defaultAddress._id); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  title="Sửa địa chỉ"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Sửa
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteAddress(defaultAddress._id); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                  title="Xóa địa chỉ"
                  disabled={addressLoading}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Địa chỉ (số nhà, đường...)</label>
                <input type="text" value={defaultAddress.Address} readOnly className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Phường/Xã</label>
                  <input type="text" value={defaultAddress.District} readOnly className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Tỉnh/Thành phố</label>
                  <input type="text" value={defaultAddress.City} readOnly className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nút hiển thị/ẩn các địa chỉ khác */}
        {otherAddresses.length > 0 && (
          <button
            onClick={() => setShowAllAddresses(!showAllAddresses)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors border-2 border-gray-300 text-gray-700 font-semibold"
          >
            <span>{showAllAddresses ? 'Ẩn' : 'Hiển thị'} các địa chỉ khác ({otherAddresses.length})</span>
            {showAllAddresses ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Hiển thị các địa chỉ khác khi expand */}
        {showAllAddresses && otherAddresses.length > 0 && (
          <div className="space-y-4">
            {otherAddresses.map((address) => (
              <div
                key={address._id}
                className={`relative p-4 border-2 rounded-xl transition-all cursor-pointer ${
                  selectedAddressId === address._id ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => handleAddressSelect(address._id)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    {selectedAddressId === address._id ? (
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 border-2 border-emerald-600 flex-shrink-0 cursor-pointer">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 cursor-pointer"></div>
                    )}
                  </div>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditingAddress(address._id); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                      title="Sửa địa chỉ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAddress(address._id); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                      title="Xóa địa chỉ"
                      disabled={addressLoading}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Địa chỉ (số nhà, đường...)</label>
                    <input type="text" value={address.Address} readOnly className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Phường/Xã</label>
                      <input type="text" value={address.District} readOnly className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Tỉnh/Thành phố</label>
                      <input type="text" value={address.City} readOnly className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}