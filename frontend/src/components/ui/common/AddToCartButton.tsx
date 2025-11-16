"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import { RootState, AppDispatch } from "@/store/redux_store"
import { addItemToCartAction, fetchCartItemCount } from "@/store/cart/cartActions"
import { Button } from "@/components/ui/common/button"
import { ShoppingCart, Loader2 } from "lucide-react"
import PopupModal from "@/components/ui/common/PopupModal"

interface AddToCartButtonProps {
  itemId: string
  availableQuantity: number
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "outline" | "ghost"
  showText?: boolean
  disabled?: boolean
}

export default function AddToCartButton({
  itemId,
  availableQuantity,
  className = "",
  size = "sm",
  variant = "outline",
  showText = false,
  disabled = false
}: AddToCartButtonProps) {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const { accessToken } = useSelector((state: RootState) => state.auth)
  const [isLoading, setIsLoading] = useState(false)

  // Popup modal state
  const [popupModal, setPopupModal] = useState({
    isOpen: false,
    type: "info" as "error" | "success" | "info",
    title: "",
    message: ""
  })

  // Show popup modal
  const showPopup = (type: "error" | "success" | "info", title: string, message: string) => {
    setPopupModal({
      isOpen: true,
      type,
      title,
      message
    })
  }

  // Close popup modal with a small delay to allow animations to complete
  const closePopup = () => {
    setPopupModal(prev => ({ ...prev, isOpen: false }))
    // Clear the message after animation completes to prevent it from reappearing
    setTimeout(() => {
      setPopupModal(prev => ({
        ...prev,
        title: "",
        message: ""
      }));
    }, 300);
  }

  const handleAddToCart = async () => {
    // Reset any previous error states
    setPopupModal(prev => ({ ...prev, isOpen: false }));
    
    if (!accessToken) {
      showPopup("error", "Lỗi", "Vui lòng đăng nhập để thêm vào giỏ hàng");
      // Redirect to login page after showing error
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
      return;
    }

    if (availableQuantity <= 0) {
      showPopup("error", "Sản phẩm không khả dụng", "Sản phẩm hiện tại đã hết hàng");
      return;
    }

    try {
      setIsLoading(true)
      
      // Set default rental dates: start today, end tomorrow (1 day rental)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      
      const rentalStartDate = today.toISOString().split('T')[0] // Format: YYYY-MM-DD
      const rentalEndDate = tomorrow.toISOString().split('T')[0] // Format: YYYY-MM-DD
      
      const result = await dispatch(addItemToCartAction({
        itemId,
        quantity: 1,
        rentalStartDate,
        rentalEndDate
      }))
      
      if (result.success) {
        showPopup("success", "Thành công", "Đã thêm vào giỏ hàng thành công")
        // Refresh cart count
        dispatch(fetchCartItemCount())
      } else {
        // Handle error from action
        const errorMessage = result.error || "Có lỗi xảy ra khi thêm vào giỏ hàng"
        let errorTitle = "Lỗi"
        
        // Check for specific error messages
        if (errorMessage.includes("Số lượng khả dụng không đủ")) {
          errorTitle = "Số lượng không đủ"
          // Extract the number from the error message
          const match = errorMessage.match(/Chỉ còn (\d+) sản phẩm/)
          if (match) {
            showPopup("error", errorTitle, `Hiện tại chỉ có ${match[1]} sản phẩm`)
          } else {
            showPopup("error", errorTitle, errorMessage)
          }
        } else if (errorMessage.includes("không khả dụng")) {
          errorTitle = "Sản phẩm không khả dụng"
          showPopup("error", errorTitle, errorMessage)
        } else if (errorMessage.includes("đăng nhập")) {
          errorTitle = "Cần đăng nhập"
          showPopup("error", errorTitle, errorMessage)
        } else {
          showPopup("error", errorTitle, errorMessage)
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      showPopup("error", "Lỗi", "Có lỗi xảy ra khi thêm vào giỏ hàng")
    } finally {
      setIsLoading(false)
    }
  }

  // Show disabled button only if item is not available
  if (availableQuantity === 0) {
    return (
      <Button
        size={size}
        variant={variant}
        className={`opacity-50 cursor-not-allowed ${className}`}
        disabled
      >
        <ShoppingCart className="h-4 w-4" />
        {showText && <span className="ml-2">Hết hàng</span>}
      </Button>
    )
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={handleAddToCart}
        disabled={isLoading || disabled}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {showText && <span className="ml-2">Đang thêm...</span>}
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            {showText && <span className="ml-2">Thêm vào giỏ</span>}
          </>
        )}
      </Button>

      {/* Popup Modal */}
      <PopupModal
        isOpen={popupModal.isOpen}
        onClose={closePopup}
        type={popupModal.type}
        title={popupModal.title}
        message={popupModal.message}
      />
    </>
  )
}
