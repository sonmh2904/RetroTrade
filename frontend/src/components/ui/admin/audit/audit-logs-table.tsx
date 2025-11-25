"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/common/table"
import { Badge } from "@/components/ui/common/badge"
import { Button } from "@/components/ui/common/button"
import { Input } from "@/components/ui/common/input"
import { History, RefreshCw, ChevronLeft, ChevronRight, Search, Filter, Calendar } from "lucide-react"
import { getAllAuditLogs, type AuditLog, type AuditLogFilters } from "@/services/audit/audit.api"
import { toast } from "sonner"
import {
  createPaginationState,
  generatePageNumbers,
  formatPaginationInfo,
  type PaginationState
} from "@/lib/pagination"

export function AuditLogsTable() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tableNameFilter, setTableNameFilter] = useState<string>("all")
  const [operationFilter, setOperationFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [paginationState, setPaginationState] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
    startIndex: 0,
    endIndex: 0
  })

  const fetchAuditLogs = async (page: number = 1) => {
    try {
      setLoading(true)
      const filters: AuditLogFilters = {
        page,
        limit: paginationState.itemsPerPage,
        ...(tableNameFilter !== "all" && { tableName: tableNameFilter }),
        ...(operationFilter !== "all" && { operation: operationFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      }

      const response = await getAllAuditLogs(filters)

      if (response && response.code === 200) {
        const items = response.data?.items || []
        const totalItems = response.data?.totalItems || 0
        const totalPages = response.data?.totalPages || 1

        setAuditLogs(items)

        const newPaginationState = createPaginationState({
          page,
          limit: paginationState.itemsPerPage,
          totalItems,
          totalPages
        })
        setPaginationState(newPaginationState)
      } else {
        const errorMessage = response?.message || "Lỗi khi tải lịch sử thay đổi"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      toast.error("Lỗi khi tải lịch sử thay đổi")
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true);
    fetchAuditLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (!hasMounted) return;
    const debounceTimer = setTimeout(() => {
      fetchAuditLogs(1);
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(debounceTimer);
  }, [tableNameFilter, operationFilter, startDate, endDate, searchTerm, hasMounted]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationState.totalPages) {
      fetchAuditLogs(page)
    }
  }

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case "INSERT":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Thêm mới</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Cập nhật</Badge>
      case "DELETE":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Xóa</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30">{operation}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      log.TableName?.toLowerCase().includes(search) ||
      log.PrimaryKeyValue?.toLowerCase().includes(search) ||
      log.ChangeSummary?.toLowerCase().includes(search) ||
      log.ChangedByUserId?.fullName?.toLowerCase().includes(search) ||
      log.ChangedByUserId?.email?.toLowerCase().includes(search)
    )
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <History className="w-5 h-5" />
            Lịch sử thay đổi ({paginationState.totalItems} bản ghi)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100"
              onClick={() => fetchAuditLogs(paginationState.currentPage)}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            />
          </div>

          {/* Table Name Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={tableNameFilter}
              onChange={(e) => setTableNameFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả bảng</option>
              <option value="User">User</option>
              <option value="Items">Items</option>
              <option value="ServiceFee">ServiceFee</option>
              <option value="UserSignatures">UserSignatures</option>
            </select>
          </div>

          {/* Operation Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả thao tác</option>
              <option value="INSERT">Thêm mới</option>
              <option value="UPDATE">Cập nhật</option>
              <option value="DELETE">Xóa</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-300 text-gray-900"
              placeholder="Từ ngày"
            />
          </div>
        </div>

        {startDate && (
          <div className="mt-2">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full md:w-64 bg-gray-50 border-gray-300 text-gray-900"
              placeholder="Đến ngày"
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải lịch sử...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-700">Thời gian</TableHead>
                  <TableHead className="text-gray-700">Bảng</TableHead>
                  <TableHead className="text-gray-700">Thao tác</TableHead>
                  <TableHead className="text-gray-700">ID bản ghi</TableHead>
                  <TableHead className="text-gray-700">Người thực hiện</TableHead>
                  <TableHead className="text-gray-700">Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-600">
                        <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">Không có lịch sử thay đổi</p>
                        <p className="text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDate(log.ChangedAt)}
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium">
                        {log.TableName}
                      </TableCell>
                      <TableCell>{getOperationBadge(log.Operation)}</TableCell>
                      <TableCell className="text-gray-600 font-mono text-sm">
                        {log.PrimaryKeyValue}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {log.ChangedByUserId ? (
                          <div>
                            <div className="font-medium">
                              {log.ChangedByUserId.fullName || log.ChangedByUserId.email || "N/A"}
                            </div>
                            {log.ChangedByUserId.role && (
                              <div className="text-xs text-gray-500">{log.ChangedByUserId.role}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Hệ thống</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm max-w-md truncate">
                        {log.ChangeSummary || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {paginationState.totalPages > 1 && (
          <div className="mt-6">
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

            <div className="flex items-center justify-center gap-2">
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
    </Card>
  )
}

