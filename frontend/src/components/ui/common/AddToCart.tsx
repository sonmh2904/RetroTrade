"use client"

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/redux_store';
import { useAppDispatch } from '@/store/hooks';
import { addItemToCartAction, fetchCartItemCount } from '@/store/cart/cartActions';
import { Button } from '@/components/ui/common/button';
import { Input } from '@/components/ui/common/input';
import { Label } from '@/components/ui/common/label';
import { Card, CardContent } from '@/components/ui/common/card';
import { Calendar, ShoppingCart, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartProps {
  itemId: string;
  availableQuantity: number;
  basePrice: number;
  depositAmount: number;
  currency: string;
  title: string;
  ownerId?: string;
}

const AddToCart: React.FC<AddToCartProps> = ({
  itemId,
  availableQuantity,
  basePrice,
  depositAmount,
  currency,
}) => {
  const dispatch = useAppDispatch();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const { loading } = useSelector((state: RootState) => state.cart);
  
  const [quantity, setQuantity] = useState(1);
  const [rentalStartDate, setRentalStartDate] = useState('');
  const [rentalEndDate, setRentalEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= availableQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!accessToken) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }

    if (quantity > availableQuantity) {
      toast.error(`Chỉ còn ${availableQuantity} sản phẩm khả dụng`);
      return;
    }

    setIsAdding(true);
    
    try {
      await dispatch(addItemToCartAction({
        itemId,
        quantity,
        rentalStartDate: rentalStartDate || undefined,
        rentalEndDate: rentalEndDate || undefined
      }));

      toast.success('Đã thêm vào giỏ hàng thành công');
      // Refresh cart count
      dispatch(fetchCartItemCount());
      // Reset form
      setQuantity(1);
      setRentalStartDate('');
      setRentalEndDate('');
    } catch {
      toast.error('Có lỗi xảy ra khi thêm vào giỏ hàng');
    } finally {
      setIsAdding(false);
    }
  };

  const calculateTotal = () => {
    return basePrice * quantity;
  };

  const calculateDepositTotal = () => {
    return depositAmount * quantity;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Số lượng</Label>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= availableQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
                (Còn {availableQuantity})
              </span>
            </div>
          </div>

          {/* Rental Dates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Ngày thuê (tùy chọn)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Từ ngày</Label>
                <Input
                  type="date"
                  value={rentalStartDate}
                  onChange={(e) => setRentalStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Đến ngày</Label>
                <Input
                  type="date"
                  value={rentalEndDate}
                  onChange={(e) => setRentalEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Giá thuê:</span>
              <span className="font-medium">
                {basePrice.toLocaleString('vi-VN')} {currency} × {quantity}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tiền cọc:</span>
              <span className="font-medium">
                {depositAmount.toLocaleString('vi-VN')} {currency} × {quantity}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tổng tiền thuê:</span>
                <span className="font-semibold">
                  {calculateTotal().toLocaleString('vi-VN')} {currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tổng tiền cọc:</span>
                <span className="font-semibold">
                  {calculateDepositTotal().toLocaleString('vi-VN')} {currency}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-indigo-600">
                <span>Tổng cộng:</span>
                <span>
                  {(calculateTotal() + calculateDepositTotal()).toLocaleString('vi-VN')} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={isAdding || loading || availableQuantity === 0}
            className="w-full"
            size="lg"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isAdding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
          </Button>

          {availableQuantity === 0 && (
            <p className="text-sm text-red-600 text-center">
              Sản phẩm hiện tại không khả dụng
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AddToCart;
