"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, AlertCircle, CheckCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/common/button"

interface PopupModalProps {
  isOpen: boolean
  onClose: () => void
  type: "error" | "success" | "info"
  title: string
  message: string
  buttonText?: string
  secondaryButtonText?: string
  onSecondaryButtonClick?: () => void
}

export default function PopupModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText = "Đóng",
  secondaryButtonText,
  onSecondaryButtonClick
}: PopupModalProps) {
  const [isVisible, setIsVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => setIsVisible(true), 10)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen && !isVisible) return null

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-12 h-12 text-red-500" />
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case "info":
        return <Info className="w-12 h-12 text-blue-500" />
      default:
        return <Info className="w-12 h-12 text-blue-500" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200"
      case "success":
        return "bg-green-50 border-green-200"
      case "info":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-blue-50 border-blue-200"
    }
  }

  const getTitleColor = () => {
    switch (type) {
      case "error":
        return "text-red-900"
      case "success":
        return "text-green-900"
      case "info":
        return "text-blue-900"
      default:
        return "text-blue-900"
    }
  }

  const getMessageColor = () => {
    switch (type) {
      case "error":
        return "text-red-700"
      case "success":
        return "text-green-700"
      case "info":
        return "text-blue-700"
      default:
        return "text-blue-700"
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-2 transform transition-all duration-300
        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        ${getBgColor()}
      `}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className={`text-2xl font-bold mb-4 ${getTitleColor()}`}>
            {title}
          </h3>

          {/* Message */}
          <p className={`text-lg mb-8 leading-relaxed whitespace-pre-line ${getMessageColor()}`}>
            {message}
          </p>

          {/* Buttons */}
          <div className={`flex ${secondaryButtonText ? 'flex-row gap-3' : 'flex-col'}`}>
            {secondaryButtonText && onSecondaryButtonClick && (
              <Button
                onClick={onSecondaryButtonClick}
                className={`
                  flex-1 py-3 px-4 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-105
                  ${type === "error" 
                    ? "bg-red-100 hover:bg-red-200 text-red-700" 
                    : type === "success"
                    ? "bg-green-100 hover:bg-green-200 text-green-700"
                    : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                  }
                `}
              >
                {secondaryButtonText}
              </Button>
            )}
            <Button
              onClick={onClose}
              className={`
                ${secondaryButtonText ? 'flex-1' : 'w-full'} py-3 px-4 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-105
                ${type === "error" 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : type === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
                }
              `}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  , document.body)
}
