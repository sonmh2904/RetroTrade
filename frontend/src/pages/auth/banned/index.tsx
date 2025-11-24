"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import { Textarea } from "@/components/ui/common/textarea";
import { AlertTriangle, Mail, Send, Home } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { submitComplaint } from "@/services/auth/complaint.api";

export default function BannedAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Khiếu nại về tài khoản bị khóa");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !message) {
      toast.error("Vui lòng nhập đầy đủ email và nội dung khiếu nại");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitComplaint({
        email,
        subject,
        message
      });

      if (response && response.code === 200) {
        toast.success("Gửi khiếu nại thành công! Chúng tôi sẽ xem xét và phản hồi bạn trong thời gian sớm nhất.");
        setEmail("");
        setMessage("");
        setSubject("Khiếu nại về tài khoản bị khóa");
      } else {
        toast.error(response?.message || "Gửi khiếu nại thất bại. Vui lòng thử lại sau.");
      }
    } catch (error) {
      console.error("Error submitting complaint:", error);
      toast.error("Có lỗi xảy ra khi gửi khiếu nại. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Locked Account Message */}
        <Card className="bg-white shadow-xl border-red-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 mb-2">
              Tài khoản của bạn đã bị khóa
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Tài khoản của bạn đã bị khóa và không thể đăng nhập vào hệ thống. 
              Nếu bạn cho rằng đây là một sai sót, vui lòng gửi khiếu nại để chúng tôi xem xét.
            </p>
          </CardHeader>
        </Card>

        {/* Complaint Form */}
        <Card className="bg-white shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-xl font-bold text-gray-900">
                Gửi khiếu nại đến quản trị viên
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email của bạn <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                  Chủ đề
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Khiếu nại về tài khoản bị khóa"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                  Nội dung khiếu nại <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Vui lòng mô tả chi tiết lý do bạn cho rằng tài khoản của mình không nên bị khóa..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[150px] bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900 resize-none"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">
                  Hãy cung cấp thông tin chi tiết để chúng tôi có thể xem xét và phản hồi bạn.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Về trang chủ
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Đang gửi..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gửi khiếu nại
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Lưu ý:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Chúng tôi sẽ xem xét khiếu nại của bạn trong thời gian sớm nhất</li>
                  <li>Phản hồi sẽ được gửi qua email bạn cung cấp</li>
                  <li>Vui lòng cung cấp thông tin chính xác và đầy đủ</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

