"use client";

import { useState } from "react";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/common/select";
import { Search, Filter, X } from "lucide-react";

interface ModerationFiltersProps {
  filters: {
    search: string;
    violationType: string;
    status: string;
  };
  onFiltersChange: (filters: {
    search: string;
    violationType: string;
    status: string;
  }) => void;
}

const VIOLATION_TYPES = [
  { value: "all", label: "Tất cả vi phạm" },
  { value: "spam", label: "Spam" },
  { value: "hate_speech", label: "Lăng mạ" },
  { value: "harassment", label: "Quấy rối" },
  { value: "inappropriate", label: "Không phù hợp" },
  { value: "off_topic", label: "Ngoài chủ đề" },
  { value: "troll", label: "Troll" },
  { value: "other", label: "Khác" },
];

export function ModerationFilters({ filters, onFiltersChange }: ModerationFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const handleSearchSubmit = () => {
    onFiltersChange({
      ...filters,
      search: localSearch,
    });
  };

  const handleViolationTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      violationType: value,
    });
  };

  const handleClearFilters = () => {
    setLocalSearch("");
    onFiltersChange({
      search: "",
      violationType: "all",
      status: filters.status,
    });
  };

  const hasActiveFilters = filters.search || filters.violationType !== "all";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tìm kiếm bình luận..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
          className="pl-10 w-64 bg-white/80 border-white/20"
        />
      </div>

      {/* Violation Type Filter */}
      <Select value={filters.violationType} onValueChange={handleViolationTypeChange}>
        <SelectTrigger className="w-48 bg-white/80 border-white/20">
          <SelectValue placeholder="Lọc theo vi phạm" />
        </SelectTrigger>
        <SelectContent>
          {VIOLATION_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search Button */}
      <Button
        onClick={handleSearchSubmit}
        variant="outline"
        className="bg-white/80 border-white/20 hover:bg-white/90"
      >
        <Search className="w-4 h-4 mr-2" />
        Tìm kiếm
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          onClick={handleClearFilters}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="w-4 h-4 mr-2" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
