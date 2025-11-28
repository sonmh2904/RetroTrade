import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  addProduct,
  getConditions,
  getPriceUnits,
  uploadImages,
  getUserAddresses,
  setDefaultAddress,
} from "../../../../services/products/product.api";
import { getCategories } from "../../../../services/products/category.api";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  MapPin,
  Tag,
  Package,
  DollarSign,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { vietnamProvinces } from "../../../../lib/vietnam-locations";

interface UserAddress {
  _id?: string;
  Address: string;
  City: string;
  District: string;
  IsDefault?: boolean;
}

interface PriceUnit {
  UnitId?: string | number;
  _id?: string;
  UnitName: string;
}

interface Category {
  _id: string;
  name?: string;
  Name?: string;
  parentCategoryId?: string;
}

interface Condition {
  ConditionId?: string | number;
  _id?: string;
  ConditionName: string;
}

const AddProductPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [secondaryPreviews, setSecondaryPreviews] = useState<string[]>([]);
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [secondaryFiles, setSecondaryFiles] = useState<File[]>([]);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [conditionId, setConditionId] = useState("");
  const [rawBasePrice, setRawBasePrice] = useState("");
  const [rawDepositAmount, setRawDepositAmount] = useState("");
  const [priceUnitId, setPriceUnitId] = useState("");
  const [minRentalDuration, setMinRentalDuration] = useState("");
  const [maxRentalDuration, setMaxRentalDuration] = useState("");
  const [quantity, setQuantity] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentUnitName, setCurrentUnitName] = useState("ngày");

  const [categories, setCategories] = useState<Category[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [priceUnits, setPriceUnits] = useState<PriceUnit[]>([]);

  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [selectedCategoryNameState, setSelectedCategoryNameState] =
    useState("Chọn danh mục");

  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const isAuthenticated = useSelector(
    (state: { auth: { accessToken: string } }) => !!state.auth.accessToken
  );

  const formatVietnameseCurrency = (value: string) => {
    if (!value) return "";
    const numValue = value.replace(/\D/g, "");
    return numValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handlePriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const inputValue = e.target.value;
    const rawValue = inputValue.replace(/\D/g, "");
    setter(rawValue);
  };

  const fetchUserAddresses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setAddressesLoading(true);
      const res = await getUserAddresses();
      const data = await res.json();
      const addresses = Array.isArray(data.data) ? data.data : [];
      setUserAddresses(addresses);
    } catch (error) {
      console.error("Error fetching user addresses:", error);
      toast.error("Không thể tải địa chỉ gợi ý");
    } finally {
      setAddressesLoading(false);
    }
  }, [isAuthenticated]);

  const prevUserAddressesRef = useRef<UserAddress[]>([]);

  useEffect(() => {
    // Chỉ chạy khi userAddresses thay đổi từ rỗng → có dữ liệu
    if (
      prevUserAddressesRef.current.length === 0 &&
      userAddresses.length > 0 &&
      !address.trim() &&
      !city.trim() &&
      !district.trim()
    ) {
      const defaultAddress = userAddresses.find((addr) => addr.IsDefault);
      if (defaultAddress) {
        setAddress(defaultAddress.Address || "");
        setCity(defaultAddress.City || "");
        setDistrict(defaultAddress.District || "");
      }
    }
    prevUserAddressesRef.current = userAddresses;
  }, [userAddresses, address, city, district]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchUserAddresses();
  }, [fetchUserAddresses]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedPath([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (priceUnitId && priceUnits.length > 0) {
      const selectedUnit = priceUnits.find(
        (unit) => (unit.UnitId?.toString() || unit._id) === priceUnitId
      );
      if (selectedUnit) {
        setCurrentUnitName(selectedUnit.UnitName.toLowerCase());
      }
    } else {
      setCurrentUnitName("ngày");
    }
  }, [priceUnitId, priceUnits]);

  if (!isAuthenticated) {
    router.push("/auth/login");
    return null;
  }

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, conditionsRes, priceUnitsRes] = await Promise.all([
        getCategories(),
        getConditions(),
        getPriceUnits(),
      ]);

      const categoriesJson = await categoriesRes.json();
      const conditionsJson = await conditionsRes.json();
      const priceUnitsJson = await priceUnitsRes.json();

      setCategories(
        Array.isArray(categoriesJson.data)
          ? categoriesJson.data
          : Array.isArray(categoriesJson)
          ? categoriesJson
          : []
      );
      setConditions(
        Array.isArray(conditionsJson.data)
          ? conditionsJson.data
          : Array.isArray(conditionsJson)
          ? conditionsJson
          : []
      );
      setPriceUnits(
        Array.isArray(priceUnitsJson.data)
          ? priceUnitsJson.data
          : Array.isArray(priceUnitsJson)
          ? priceUnitsJson
          : []
      );
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Không thể tải dữ liệu ban đầu");
    }
  };

  const selectAddress = (addr: UserAddress) => {
    setAddress(addr.Address || "");
    setCity(addr.City || "");
    setDistrict(addr.District || "");
    setShowAddressSuggestions(false);
  };

  const isCurrentAddressDefault = () => {
    return userAddresses.some(
      (addr) =>
        addr.IsDefault &&
        addr.Address === address &&
        addr.City === city &&
        addr.District === district
    );
  };

  const handleSetDefaultAddress = async () => {
    if (!address || !city || !district) {
      toast.error("Vui lòng nhập đầy đủ địa chỉ trước khi đặt mặc định");
      return;
    }

    try {
      setSettingDefault(true);
      const res = await setDefaultAddress({
        Address: address,
        City: city,
        District: district,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã đặt địa chỉ mặc định thành công!");
        // Refresh addresses to update IsDefault
        await fetchUserAddresses();
      } else {
        toast.error(data.message || "Lỗi khi đặt địa chỉ mặc định");
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error("Lỗi khi đặt địa chỉ mặc định");
    } finally {
      setSettingDefault(false);
    }
  };

  const handlePrimaryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Chỉ chấp nhận file hình ảnh");
        return;
      }
      setPrimaryFile(file);
      setPrimaryPreview(URL.createObjectURL(file));
    }
  };

  const removePrimaryImage = () => {
    setPrimaryFile(null);
    setPrimaryPreview(null);
    if (primaryInputRef.current) primaryInputRef.current.value = "";
  };

  const handleSecondaryImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (secondaryFiles.length + newFiles.length > 5) {
        toast.error("Tối đa 5 hình ảnh phụ được phép");
        return;
      }
      setSecondaryFiles((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setSecondaryPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeSecondaryImage = (index: number) => {
    setSecondaryFiles((prev) => prev.filter((_, i) => i !== index));
    setSecondaryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value);
  };

  const handleTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const currentValue = tagsInput.trim();
      if (currentValue && !tags.includes(currentValue)) {
        setTags((prev) => [...prev, currentValue]);
      }
      setTagsInput("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleCategoryClick = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      setSelectedPath([]);
    }
  };

  const handleBackClick = () => {
    setSelectedPath((prev) => prev.slice(0, -1));
  };

  const hasChildren = (catId: string): boolean => {
    return categories.some(
      (c) =>
        c.parentCategoryId && c.parentCategoryId.toString() === catId.toString()
    );
  };

  const handleCategorySelect = (cat: {
    _id: string;
    name?: string;
    Name?: string;
  }) => {
    const catId = cat._id.toString();
    const categoryName = cat.name || cat.Name || `Unnamed Category`;
    if (!hasChildren(catId)) {
      setCategoryId(catId);
      setSelectedCategoryNameState(categoryName);
      setShowDropdown(false);
      setSelectedPath([]);
    } else {
      setSelectedPath((prev) => [...prev, catId]);
    }
  };

  const renderCurrentCategories = () => {
    let currentCats = categories.filter((c) => !c.parentCategoryId);
    for (const id of selectedPath) {
      currentCats = categories.filter(
        (c) => c.parentCategoryId && c.parentCategoryId.toString() === id
      );
      if (currentCats.length === 0) break;
    }
    return currentCats.map((cat, index) => {
      const catId = cat._id.toString();
      const categoryName = cat.name || cat.Name || `Unnamed Category ${index}`;
      return (
        <div
          key={catId || index}
          className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-b-0"
          onClick={() => handleCategorySelect(cat)}
        >
          <span className="text-gray-700">{categoryName}</span>
          {hasChildren(catId) && (
            <span className="text-blue-500 text-sm">→</span>
          )}
        </div>
      );
    });
  };

  const validateForm = () => {
    if (!title.trim()) return "Tên sản phẩm là bắt buộc";
    if (!rawBasePrice || parseFloat(rawBasePrice) <= 0)
      return "Giá thuê phải là số dương";
    if (!rawDepositAmount || parseFloat(rawDepositAmount) <= 0)
      return "Tiền đặt cọc phải là số dương";
    if (!quantity || parseInt(quantity) < 1) return "Số lượng phải ít nhất 1";
    if (!categoryId) return "Danh mục là bắt buộc";
    if (!conditionId) return "Tình trạng là bắt buộc";
    if (!priceUnitId) return "Đơn vị giá là bắt buộc";
    if (!primaryFile) return "Hình ảnh chính là bắt buộc";
    if (secondaryFiles.length > 5) return "Tối đa 5 hình ảnh phụ được phép";
    const minDur = parseInt(minRentalDuration) || 0;
    const maxDur = parseInt(maxRentalDuration) || 0;
    if (minDur > 0 && maxDur > 0 && minDur > maxDur)
      return "Thời gian thuê tối thiểu không được vượt quá thời gian thuê tối đa";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload images first (primary first, then secondary)
      const imageFormData = new FormData();
      if (primaryFile) {
        imageFormData.append("images", primaryFile);
      }
      secondaryFiles.forEach((file) => {
        imageFormData.append("images", file);
      });
      const uploadRes = await uploadImages(imageFormData);
      const uploadResult = await uploadRes.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "Tải hình ảnh thất bại");
      }
      const imageUrls =
        uploadResult.data.map((img: { Url: string }) => img.Url) || [];

      // Step 2: Prepare JSON body with image URLs - Clean tags to array
      const cleanTags = tags.filter((t) => t && t.trim().length > 0);
      const productData = {
        Title: title.trim(),
        ShortDescription: shortDescription.trim(),
        Description: description.trim(),
        CategoryId: categoryId,
        ConditionId: conditionId,
        BasePrice: rawBasePrice, // Use raw
        PriceUnitId: priceUnitId,
        DepositAmount: rawDepositAmount, // Use raw
        MinRentalDuration: minRentalDuration || undefined,
        MaxRentalDuration: maxRentalDuration || undefined,
        Currency: "VND",
        Quantity: quantity,
        Address: address.trim() || undefined,
        District: district.trim() || undefined,
        City: city.trim() || undefined,
        Tags: cleanTags.length > 0 ? cleanTags : [],
        ImageUrls: imageUrls,
      };

      // Step 3: Send JSON to addProduct
      const addRes = await addProduct(productData);
      const result = await addRes.json();
      if (result.success) {
        toast.success("Sản phẩm được thêm thành công!");
        router.push("/owner/myproducts");
      } else {
        toast.error(result.message || "Thêm sản phẩm thất bại");
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      toast.error("Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Quay lại</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Thêm sản phẩm mới
          </h1>
          <p className="text-gray-600">
            Tạo sản phẩm cho thuê mới cho hệ thống
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Image Upload Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Hình ảnh sản phẩm
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Primary Image */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-800">
                  Hình ảnh chính <span className="text-red-500">*</span>
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
                  {primaryPreview ? (
                    <div className="relative">
                      <Image
                        src={primaryPreview}
                        alt="Hình ảnh chính"
                        width={400}
                        height={192}
                        className="object-cover rounded-lg w-full h-48"
                      />
                      <button
                        type="button"
                        onClick={removePrimaryImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="primary-upload"
                      className="cursor-pointer block text-center py-8"
                    >
                      <div className="text-4xl mb-4">📷</div>
                      <p className="text-gray-600 font-medium">
                        Click để upload hình ảnh chính
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        PNG, JPG dưới 5MB
                      </p>
                    </label>
                  )}
                  <input
                    ref={primaryInputRef}
                    id="primary-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handlePrimaryImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Secondary Images */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-800">
                  Hình ảnh phụ (tối đa 5)
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
                  <label
                    htmlFor="secondary-upload"
                    className="cursor-pointer block text-center py-4 mb-4"
                  >
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-gray-600 font-medium">
                      Click để upload hình ảnh phụ
                    </p>
                    <p className="text-sm text-gray-400">PNG, JPG dưới 5MB</p>
                  </label>
                  <input
                    ref={secondaryInputRef}
                    id="secondary-upload"
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleSecondaryImageChange}
                    className="hidden"
                  />
                  {secondaryPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {secondaryPreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <Image
                            src={preview}
                            alt={`Hình ảnh phụ ${idx + 1}`}
                            width={100}
                            height={96}
                            className="object-cover rounded-lg w-full h-24"
                          />
                          <button
                            type="button"
                            onClick={() => removeSecondaryImage(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {secondaryFiles.length < 5 && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => secondaryInputRef.current?.click()}
                        className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Thông tin cơ bản
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Nhập tên sản phẩm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả ngắn
                  </label>
                  <textarea
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Mô tả ngắn về sản phẩm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Mô tả chi tiết về sản phẩm"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleCategoryClick}
                      className="w-full p-3 border border-gray-300 rounded-lg text-left bg-white flex justify-between items-center hover:border-blue-400 transition-colors"
                    >
                      <span
                        className={
                          selectedCategoryNameState === "Chọn danh mục"
                            ? "text-gray-500"
                            : "text-gray-900"
                        }
                      >
                        {selectedCategoryNameState}
                      </span>
                      <span className="text-gray-400">▼</span>
                    </button>
                    {showDropdown && (
                      <div
                        ref={categoryDropdownRef}
                        className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden"
                      >
                        {selectedPath.length > 0 && (
                          <button
                            type="button"
                            onClick={handleBackClick}
                            className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium border-b border-gray-200"
                          >
                            ← Quay lại
                          </button>
                        )}
                        <div className="max-h-60 overflow-y-auto">
                          {renderCurrentCategories()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tình trạng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={conditionId}
                    onChange={(e) => setConditionId(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Chọn tình trạng</option>
                    {conditions.map((cond) => (
                      <option
                        key={cond.ConditionId?.toString() || cond._id}
                        value={cond.ConditionId?.toString() || cond._id}
                      >
                        {cond.ConditionName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Nhập số lượng"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Giá cả và thời gian
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giá thuê (VND) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={formatVietnameseCurrency(rawBasePrice)}
                      onChange={(e) => handlePriceChange(e, setRawBasePrice)}
                      required
                      placeholder="Nhập giá thuê"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    <span className="text-gray-500 font-medium">/</span>
                    <select
                      value={priceUnitId}
                      onChange={(e) => setPriceUnitId(e.target.value)}
                      required
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Chọn đơn vị</option>
                      {priceUnits.map((unit) => (
                        <option
                          key={unit.UnitId?.toString() || unit._id}
                          value={unit.UnitId?.toString() || unit._id}
                        >
                          {unit.UnitName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiền đặt cọc (VND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formatVietnameseCurrency(rawDepositAmount)}
                    onChange={(e) => handlePriceChange(e, setRawDepositAmount)}
                    required
                    placeholder="Nhập tiền đặt cọc"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian thuê tối thiểu ({currentUnitName})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minRentalDuration}
                    onChange={(e) => setMinRentalDuration(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder={`Nhập số ${currentUnitName} tối thiểu`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian thuê tối đa ({currentUnitName})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxRentalDuration}
                    onChange={(e) => setMaxRentalDuration(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder={`Nhập số ${currentUnitName} tối đa`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Vị trí
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tỉnh/Thành phố
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Chọn tỉnh/thành phố</option>
                  {vietnamProvinces.map((province: string) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xã/Phường
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Nhập xã/phường"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ cụ thể
                </label>
                <input
                  ref={addressInputRef}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Nhập địa chỉ cụ thể"
                />
              </div>
            </div>

            {/* Nút set default - chỉ hiển thị nếu không phải default */}
            {!isCurrentAddressDefault() && (address || city || district) && (
              <div className="mt-4 flex justify-start">
                <button
                  type="button"
                  onClick={handleSetDefaultAddress}
                  disabled={settingDefault}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {settingDefault ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Đặt làm địa chỉ mặc định
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Gợi ý địa chỉ - giữ nguyên */}
            {userAddresses.length > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddressSuggestions(!showAddressSuggestions)
                  }
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 transition-colors"
                >
                  Gợi ý địa chỉ trước đó ({userAddresses.length})
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      showAddressSuggestions ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showAddressSuggestions && (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto border border-gray-200">
                    {addressesLoading ? (
                      <p className="text-gray-500 text-sm">Đang tải...</p>
                    ) : (
                      <div className="space-y-2">
                        {userAddresses.map((addr, index) => (
                          <button
                            key={addr._id || index}
                            type="button"
                            onClick={() => selectAddress(addr)}
                            className={`w-full text-left p-3 bg-white rounded-md hover:bg-blue-50 border border-gray-200 transition-colors text-sm ${
                              addr.IsDefault
                                ? "border-green-500 bg-green-50"
                                : ""
                            }`}
                          >
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {addr.District}, {addr.City}
                              {addr.IsDefault && (
                                <CheckCircle
                                  size={16}
                                  className="text-green-600"
                                />
                              )}
                            </div>
                            <div className="text-gray-600 truncate">
                              {addr.Address}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-600" />
              Thẻ (Tags)
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thẻ (nhập và nhấn Enter hoặc dấu phẩy để thêm)
              </label>
              <input
                ref={tagsInputRef}
                type="text"
                value={tagsInput}
                onChange={handleTagsChange}
                onKeyDown={handleTagsKeyDown}
                placeholder="ví dụ: cổ điển, điện tử, vintage"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors mb-4"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-100 text-gray-700 p-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white p-4 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Package size={16} />
                  Lưu sản phẩm
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductPage;
