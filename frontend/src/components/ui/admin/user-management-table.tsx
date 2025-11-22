"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/common/table"
import { Badge } from "@/components/ui/common/badge"
import { Button } from "@/components/ui/common/button"
import { Input } from "@/components/ui/common/input"
import { Users, Eye, RefreshCw, ChevronLeft, ChevronRight, UserCog, Search, Filter } from "lucide-react"  
import { getAllUsers, updateUserRole } from "@/services/auth/user.api"
import { toast } from "sonner"
import type { UserProfile } from "@/services/iService"
import { 
  createPaginationState, 
  generatePageNumbers, 
  formatPaginationInfo,
  type PaginationState 
} from "@/lib/pagination"
import { RoleChangeModal } from "@/components/ui/admin/role-change-modal"
import { decodeToken } from "@/utils/jwtHelper"
import { RootState } from "@/store/redux_store"

export function UserManagementTable() {
  const router = useRouter()
  const accessToken = useSelector((state: RootState) => state.auth.accessToken)
  
  // Get current admin role
  const currentAdminRole = useMemo(() => {
    if (!accessToken) return null
    const decoded = decodeToken(accessToken)
    return decoded?.role?.toLowerCase() || null
  }, [accessToken])
  
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [roleChangeModalOpen, setRoleChangeModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
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
      // If statusFilter is "banned", set onlyBanned to true
      const onlyBanned = statusFilter === "banned"
      const actualStatusFilter = statusFilter === "banned" ? "" : statusFilter
      
      const response = await getAllUsers(
        page, 
        paginationState.itemsPerPage, 
        onlyBanned,
        searchTerm.trim(),
        roleFilter,
        actualStatusFilter
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
  }, [searchTerm, roleFilter, statusFilter, hasMounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewUser = (userId: string) => {
    router.push(`/admin/user-management/${userId}`)
  }

  const handleRoleChangeClick = (user: UserProfile) => {
    // Prevent admin from changing role of users with same role level
    if (currentAdminRole && user.role?.toLowerCase() === currentAdminRole) {
      toast.error("Bạn không thể chỉnh quyền cho tài khoản cùng cấp bậc")
      return
    }
    setSelectedUser(user)
    setRoleChangeModalOpen(true)
  }

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      setRoleChangeLoading(true)
      const response = await updateUserRole(userId, newRole)
      if (response && response.code === 200) {
        toast.success("Cập nhật vai trò thành công")
        fetchUsers(paginationState.currentPage) // Refresh current page
        setRoleChangeModalOpen(false)
        setSelectedUser(null)
      } else {
        const errorMessage = response?.message || "Lỗi khi cập nhật vai trò"
        toast.error(errorMessage)
        console.error("API Error:", response)
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Lỗi khi cập nhật vai trò")
    } finally {
      setRoleChangeLoading(false)
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
            Quản lý người dùng ({paginationState.totalItems} users)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Status Filter (includes banned filter) */}
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
              <option value="banned" className="bg-gray-50 text-gray-900">Đã bị khóa</option>
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
                <TableHead className="text-gray-700">Trạng thái</TableHead>
                <TableHead className="text-gray-700">Điểm uy tín</TableHead>
                <TableHead className="text-gray-700">Ngày tạo</TableHead>
                <TableHead className="text-gray-700">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-gray-600">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Không tìm thấy người dùng</p>
                      <p className="text-sm">
                        {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                          ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" 
                          : "Chưa có người dùng nào trong hệ thống"}
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
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleRoleChangeClick(user)}
                          title={currentAdminRole && user.role?.toLowerCase() === currentAdminRole ? "Không thể chỉnh quyền cho tài khoản cùng cấp bậc" : "Đổi quyền"}
                          disabled={!!(currentAdminRole && user.role?.toLowerCase() === currentAdminRole)}
                        >
                          <UserCog className="w-4 h-4" />
                        </Button>
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

      {/* Role Change Modal */}
      <RoleChangeModal
        open={roleChangeModalOpen}
        onOpenChange={setRoleChangeModalOpen}
        user={selectedUser}
        onConfirm={handleRoleUpdate}
        loading={roleChangeLoading}
        currentAdminRole={currentAdminRole}
      />

    </Card>
  )
}
