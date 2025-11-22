"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/common/table"
import { Badge } from "@/components/ui/common/badge"
import { Button } from "@/components/ui/common/button"
import { Input } from "@/components/ui/common/input"
import { Label } from "@/components/ui/common/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/common/dialog"
import { Textarea } from "@/components/ui/common/textarea"
import { Users, Eye, RefreshCw, ChevronLeft, ChevronRight, Search, Filter, Ban, Unlock, AlertTriangle } from "lucide-react"  
import { getUsersForModeration, banUser, unbanUser } from "@/services/auth/user.api"
import { toast } from "sonner"
import type { UserProfile } from "@/services/iService"
import { 
  createPaginationState, 
  generatePageNumbers, 
  formatPaginationInfo,
  type PaginationState 
} from "@/lib/pagination"
import { decodeToken } from "@/utils/jwtHelper"
import { RootState } from "@/store/redux_store"

export function ModeratorUserManagementTable() {
  const router = useRouter()
  const accessToken = useSelector((state: RootState) => state.auth.accessToken)
  
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("all") // Filter theo loại vấn đề
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false)
  const [userToBan, setUserToBan] = useState<{ id: string; name: string } | null>(null)
  const [banReason, setBanReason] = useState("")
  const [paginationState, setPaginationState] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
    startIndex: 0,
    endIndex: 0
  })

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true)
      // Moderator chỉ lấy user có vấn đề (có report, complaint, dispute, hoặc đã bị ban)
      const actualStatusFilter = statusFilter === "banned" ? "" : statusFilter
      
      const response = await getUsersForModeration(
        page, 
        paginationState.itemsPerPage, 
        searchTerm.trim(),
        roleFilter,
        actualStatusFilter,
        issueTypeFilter
      )
      
      // Check if response exists and has correct structure
      if (response && response.code === 200) {
        const items = response.data?.items || []
        const totalItems = response.data?.totalItems || 0
        const totalPages = response.data?.totalPages || 1
        
        setUsers(items)
        
        // Update pagination state
        const newPaginationState = createPaginationState({
          page,
          limit: paginationState.itemsPerPage,
          totalItems,
          totalPages
        })
        setPaginationState(newPaginationState)
      } else {
        const errorMessage = response?.message || "Lỗi khi tải danh sách users"
        toast.error(errorMessage)
        console.error("API Error:", response)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Lỗi khi tải danh sách users")
    } finally {
      setLoading(false)
    }
  }

  // Track if component has mounted to avoid duplicate fetches
  const [hasMounted, setHasMounted] = useState(false)

  // Initial fetch on mount
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true)
      fetchUsers(1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search term and refetch when filters change
  useEffect(() => {
    // Only fetch if component has already mounted (initial fetch done)
    if (!hasMounted) {
      return
    }

    const debounceTimer = setTimeout(() => {
      fetchUsers(1) // Reset to page 1 when filters change
    }, searchTerm ? 500 : 0) // Only delay if there's a search term, otherwise immediate

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, roleFilter, statusFilter, issueTypeFilter, hasMounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewUser = (userId: string) => {
    router.push(`/moderator/user-management/${userId}`)
  }

  const handleBanClick = (userId: string, userName: string) => {
    setUserToBan({ id: userId, name: userName })
    setBanReason("")
    setBanDialogOpen(true)
  }

  const handleBanConfirm = async () => {
    if (!userToBan) return

    if (!banReason || banReason.trim().length === 0) {
      toast.error("Vui lòng nhập lý do khóa tài khoản")
      return
    }

    try {
      const response = await banUser(userToBan.id, banReason.trim())
      if (response && response.code === 200) {
        toast.success("Khóa tài khoản thành công")
        fetchUsers(paginationState.currentPage)
        setBanDialogOpen(false)
        setUserToBan(null)
        setBanReason("")
      } else {
        const errorMessage = response?.message || "Lỗi khi khóa tài khoản"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error banning user:", error)
      toast.error("Lỗi khi khóa tài khoản")
    }
  }

  const handleUnbanClick = (userId: string, userName: string) => {
    setUserToBan({ id: userId, name: userName })
    setUnbanDialogOpen(true)
  }

  const handleUnbanConfirm = async () => {
    if (!userToBan) return

    try {
      const response = await unbanUser(userToBan.id)
      if (response && response.code === 200) {
        toast.success("Mở khóa tài khoản thành công")
        fetchUsers(paginationState.currentPage)
        setUnbanDialogOpen(false)
        setUserToBan(null)
      } else {
        const errorMessage = response?.message || "Lỗi khi mở khóa tài khoản"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error unbanning user:", error)
      toast.error("Lỗi khi mở khóa tài khoản")
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationState.totalPages) {
      fetchUsers(page)
    }
  }

  // Server-side filtering is now handled, so we use users directly
  const filteredUsers = users

  const getStatusBadge = (user: UserProfile) => {
    // Check if user is banned first
    if (user.isDeleted) {
      return <Badge className="bg-red-600 text-white border-red-700">Đã bị khóa</Badge>
    }
    
    if (user.isEmailConfirmed && user.isPhoneConfirmed && user.isIdVerified) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Đã xác minh</Badge>
    } else if (user.isEmailConfirmed) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Chờ xác minh</Badge>
    } else {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Chưa xác minh</Badge>
    }
  }

  const getIssueBadges = (issues: string[] = []) => {
    if (!issues || issues.length === 0) {
      return <span className="text-gray-400 text-sm">Không có</span>;
    }

    const issueLabels: Record<string, { label: string; color: string }> = {
      complaint: { label: "Khiếu nại", color: "bg-orange-100 text-orange-700 border-orange-200" },
      report: { label: "Bị báo cáo", color: "bg-red-100 text-red-700 border-red-200" },
      dispute: { label: "Tranh chấp", color: "bg-purple-100 text-purple-700 border-purple-200" },
      banned: { label: "Đã bị khóa", color: "bg-gray-100 text-gray-700 border-gray-200" }
    };

    return (
      <div className="flex flex-wrap gap-1">
        {issues.map((issue, index) => {
          const issueInfo = issueLabels[issue];
          if (!issueInfo) return null;
          return (
            <Badge
              key={index}
              variant="outline"
              className={`${issueInfo.color} text-xs font-medium`}
            >
              {issueInfo.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Quản trị viên</Badge>
      case "moderator":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Điều hành viên</Badge>
      case "owner":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Chủ sở hữu</Badge>
      case "renter":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Người thuê</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
            <span className="ml-2 text-gray-600">Đang tải danh sách users...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Users className="w-5 h-5" />
            Người dùng cần xử lý ({paginationState.totalItems} users)
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-gray-600 hover:bg-gray-100"
              onClick={() => fetchUsers(paginationState.currentPage)}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Tìm theo email hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            />
          </div>

          {/* Issue Type Filter - Filter theo loại vấn đề */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-50 text-gray-900">Tất cả loại vấn đề</option>
              <option value="complaint" className="bg-gray-50 text-gray-900">Có khiếu nại</option>
              <option value="report" className="bg-gray-50 text-gray-900">Bị báo cáo</option>
              <option value="dispute" className="bg-gray-50 text-gray-900">Có tranh chấp</option>
              <option value="banned" className="bg-gray-50 text-gray-900">Đã bị khóa</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-50 text-gray-900">Tất cả quyền</option>
              <option value="renter" className="bg-gray-50 text-gray-900">Người thuê</option>
              <option value="owner" className="bg-gray-50 text-gray-900">Chủ sở hữu</option>
              <option value="moderator" className="bg-gray-50 text-gray-900">Điều hành viên</option>
              <option value="admin" className="bg-gray-50 text-gray-900">Quản trị viên</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-50 text-gray-900">Tất cả trạng thái</option>
              <option value="verified" className="bg-gray-50 text-gray-900">Đã xác minh</option>
              <option value="pending" className="bg-gray-50 text-gray-900">Chờ xác minh</option>
              <option value="unverified" className="bg-gray-50 text-gray-900">Chưa xác minh</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700">Tên</TableHead>
                <TableHead className="text-gray-700">Email</TableHead>
                <TableHead className="text-gray-700">Vai trò</TableHead>
                <TableHead className="text-gray-700">Vấn đề</TableHead>
                <TableHead className="text-gray-700">Trạng thái</TableHead>
                <TableHead className="text-gray-700">Điểm uy tín</TableHead>
                <TableHead className="text-gray-700">Ngày tạo</TableHead>
                <TableHead className="text-gray-700">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-600">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Không tìm thấy người dùng</p>
                      <p className="text-sm">
                        {searchTerm || roleFilter !== "all" || statusFilter !== "all" || issueTypeFilter !== "all"
                          ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" 
                          : "Hiện tại không có người dùng nào cần xử lý (có khiếu nại, bị báo cáo, tranh chấp hoặc đã bị khóa)"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="text-gray-900 font-medium">
                      {user.displayName || user.fullName}
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {getIssueBadges((user as any).issues)}
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>{user.reputationScore}/5</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ width: `${(user.reputationScore / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết"
                          onClick={() => handleViewUser(user._id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {user.isDeleted ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleUnbanClick(user._id, user.fullName || user.email || "người dùng")}
                            title="Mở khóa tài khoản"
                          >
                            <Unlock className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleBanClick(user._id, user.fullName || user.email || "người dùng")}
                            title="Ban người dùng"
                            disabled={user.role === 'admin' || user.role === 'moderator'}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {paginationState.totalPages > 1 && (
          <div className="mt-6">
            {/* Pagination Info */}
            <div className="text-gray-600 text-sm mb-4 text-center">
              {formatPaginationInfo({
                page: paginationState.currentPage,
                limit: paginationState.itemsPerPage,
                totalItems: paginationState.totalItems,
                totalPages: paginationState.totalPages,
                hasNextPage: paginationState.hasNextPage,
                hasPrevPage: paginationState.hasPrevPage,
                startIndex: paginationState.startIndex,
                endIndex: paginationState.endIndex
              })}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-2">
              {/* Previous Button */}
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100"
                onClick={() => handlePageChange(paginationState.currentPage - 1)}
                disabled={!paginationState.hasPrevPage}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Trước
              </Button>
              
              {/* Page Numbers */}
              {generatePageNumbers(paginationState.currentPage, paginationState.totalPages, 5).map((pageNum) => (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={pageNum === paginationState.currentPage ? "default" : "ghost"}
                  className={
                    pageNum === paginationState.currentPage
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              
              {/* Next Button */}
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100"
                onClick={() => handlePageChange(paginationState.currentPage + 1)}
                disabled={!paginationState.hasNextPage}
              >
                Sau
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Khóa tài khoản người dùng
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 mt-2">
              Bạn có chắc chắn muốn khóa tài khoản của <span className="font-semibold text-gray-900">&quot;{userToBan?.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banReason" className="text-sm font-medium text-gray-700">
                Lý do khóa tài khoản <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="banReason"
                placeholder="Nhập lý do khóa tài khoản... Ví dụ: Vi phạm điều khoản sử dụng, spam, gian lận..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[120px] bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 text-gray-900 resize-none"
                required
              />
              <p className="text-xs text-gray-500">
                Lý do này sẽ được gửi qua email cho người dùng
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Lưu ý:</strong> Người dùng sẽ không thể đăng nhập sau khi bị khóa. Email thông báo sẽ được gửi tự động cho người dùng.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setBanDialogOpen(false)
                setUserToBan(null)
                setBanReason("")
              }}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Hủy
            </Button>
            <Button
              onClick={handleBanConfirm}
              disabled={!banReason || banReason.trim().length === 0}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ban className="w-4 h-4 mr-2" />
              Khóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban User Dialog */}
      <Dialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Unlock className="w-6 h-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Xác nhận mở khóa tài khoản
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 mt-2">
              Bạn có chắc chắn muốn mở khóa tài khoản của <span className="font-semibold text-gray-900">&quot;{userToBan?.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-800">
              <strong>Lưu ý:</strong> Người dùng sẽ có thể đăng nhập lại sau khi được mở khóa. Email thông báo sẽ được gửi tự động cho người dùng.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setUnbanDialogOpen(false)
                setUserToBan(null)
              }}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Hủy
            </Button>
            <Button
              onClick={handleUnbanConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Mở khóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

