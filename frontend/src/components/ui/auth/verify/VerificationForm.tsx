"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../common/card";
import { Shield, ChevronRight } from "lucide-react";
import PhoneInput from "@/components/ui/auth/verify/PhoneInput";
import OTPInput from "@/components/ui/auth/verify/OTPInput";
import ImageUpload from "@/components/ui/auth/verify/ImageUpload";
import ResultDisplay from "@/components/ui/auth/verify/ResultDisplay";
import VerificationScript from "@/components/ui/auth/verify/VerificationScript";
import { FaceVerificationResponse } from "@/services/auth/faceVerification.api";

interface VerificationFormProps {
    phoneNumber: string;
    setPhoneNumber: (value: string) => void;
    otp: string;
    setOtp: (value: string) => void;
    images: File[];
    setImages: (files: File[]) => void;
    result: { success: boolean; message: string; details?: string } | null;
    isLoading: boolean;
    onSendOTP: () => Promise<void>;
    onVerifyOTP: () => Promise<void>;
    onSubmitVerification: (verificationResult?: FaceVerificationResponse) => Promise<void>;
    onRestart: () => void;
    breadcrumbs: Array<{
        name: string;
        href: string;
        icon?: React.ComponentType<{ className?: string }>;
        current?: boolean;
    }>;
}

export default function VerificationForm({
    phoneNumber,
    setPhoneNumber,
    otp,
    setOtp,
    images,
    setImages,
    result,
    isLoading,
    onSendOTP,
    onVerifyOTP,
    onSubmitVerification,
    onRestart,
    breadcrumbs
}: VerificationFormProps) {
    const [step, setStep] = useState(1);
    const [error, setError] = useState<string>("");
    const [failedStep, setFailedStep] = useState<number | null>(null);

    const handleNext = () => {
        setStep(step + 1);
        setFailedStep(null);
    };
    const handleBack = () => setStep(step - 1);

    const steps = [
        { id: 1, title: "Nhập số điện thoại", description: "Nhập số điện thoại Việt Nam để nhận mã OTP" },
        { id: 2, title: "Nhập mã OTP", description: "Nhập mã xác thực 6 chữ số" },
        { id: 3, title: "Tải ảnh xác minh", description: "Tải lên ảnh mặt trước và mặt sau CCCD" },
        { id: 4, title: "Kết quả", description: "Kết quả xác minh danh tính" },
    ];

    const handlePhoneNext = async () => {
        try {
            setError("");
            setFailedStep(null);
            await onSendOTP();
            handleNext();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi gửi OTP");
            setFailedStep(1);
        }
    };

    const handleOTPNext = async () => {
        try {
            setError("");
            setFailedStep(null);
            await onVerifyOTP();
            handleNext();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi xác minh OTP");
            setFailedStep(2);
        }
    };

    const handleImageNext = async (verificationResult?: FaceVerificationResponse) => {
        try {
            setError("");
            setFailedStep(null);
            await onSubmitVerification(verificationResult);
            handleNext();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi xử lý ảnh");
            setFailedStep(3);
        }
    };

    const handleRestart = () => {
        setStep(1);
        setError("");
        setFailedStep(null);
        onRestart();
    };

    const handleRetryStep = (stepNumber: number) => {
        setStep(stepNumber);
        setError("");
        setFailedStep(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 pt-20 pb-8">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    {/* Breadcrumb Navigation */}
                    <div className="flex justify-start">
                        <nav className="flex items-center space-x-1 text-sm">
                            {breadcrumbs.map((breadcrumb, index) => {
                                const IconComponent = breadcrumb.icon;
                                const isLast = index === breadcrumbs.length - 1;
                                
                                return (
                                    <div key={breadcrumb.name} className="flex items-center">
                                        {index === 0 && IconComponent && (
                                            <IconComponent className="w-4 h-4 text-gray-500 mr-1" />
                                        )}
                                        
                                        {isLast ? (
                                            <span className="text-gray-900 font-medium">
                                                {breadcrumb.name}
                                            </span>
                                        ) : (
                                            <Link
                                                href={breadcrumb.href}
                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                {breadcrumb.name}
                                            </Link>
                                        )}
                                        
                                        {!isLast && (
                                            <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Verification Script */}
                    <VerificationScript />

                    <Card className="w-full">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                                <Shield className="w-6 h-6 text-blue-600" />
                                Xác minh danh tính
                            </CardTitle>
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${(step / steps.length) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-gray-700">
                                        Bước {step}: {steps[step - 1].title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {steps[step - 1].description}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {step === 1 && (
                                <PhoneInput
                                    phoneNumber={phoneNumber}
                                    setPhoneNumber={setPhoneNumber}
                                    onNext={handlePhoneNext}
                                    isLoading={isLoading}
                                />
                            )}
                            {step === 2 && (
                                <OTPInput
                                    otp={otp}
                                    setOtp={setOtp}
                                    onNext={handleOTPNext}
                                    onBack={handleBack}
                                    isLoading={isLoading}
                                />
                            )}
                            {step === 3 && (
                                <ImageUpload
                                    images={images}
                                    setImages={setImages}
                                    onNext={handleImageNext}
                                    onBack={handleBack}
                                    isLoading={isLoading}
                                    phoneNumber={phoneNumber}
                                />
                            )}
                            {step === 4 && (
                                <ResultDisplay
                                    result={result}
                                    onRestart={handleRestart}
                                    onRetryStep={handleRetryStep}
                                    failedStep={failedStep}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}