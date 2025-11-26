import { RegisterForm } from "@/components/ui/auth/registerForm";
import Image from "next/image";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 opacity-90"></div>
        <div className="relative w-full h-full flex items-center justify-center p-12">
          <div className="relative w-full h-full max-w-lg">
            <Image
              src="/share.png"
              alt="Retro Trade Logo"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white lg:bg-transparent">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
