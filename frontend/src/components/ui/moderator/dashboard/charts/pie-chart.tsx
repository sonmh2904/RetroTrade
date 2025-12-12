"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";

interface PieData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  title: string;
  data: PieData[];
  loading?: boolean;
}

export function PieChart({ title, data, loading = false }: PieChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Không có dữ liệu
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate angles for each slice
  let currentAngle = -90; // Start from top
  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      angle
    };
  });

  // Create SVG path for pie slice
  const createSlicePath = (startAngle: number, endAngle: number, innerRadius: number = 0, outerRadius: number = 50) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = 50 + innerRadius * Math.cos(startAngleRad);
    const y1 = 50 + innerRadius * Math.sin(startAngleRad);
    const x2 = 50 + outerRadius * Math.cos(startAngleRad);
    const y2 = 50 + outerRadius * Math.sin(startAngleRad);
    const x3 = 50 + outerRadius * Math.cos(endAngleRad);
    const y3 = 50 + outerRadius * Math.sin(endAngleRad);
    const x4 = 50 + innerRadius * Math.cos(endAngleRad);
    const y4 = 50 + innerRadius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    if (innerRadius === 0) {
      // Full pie slice
      return `M 50 50 L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} Z`;
    } else {
      // Donut slice
      return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <svg className="w-full h-full max-w-[200px]" viewBox="0 0 100 100">
              {/* Pie slices */}
              {slices.map((slice, index) => (
                <g key={index} className="group">
                  <path
                    d={createSlicePath(slice.startAngle, slice.endAngle, 0, 50)}
                    fill={slice.color}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    style={{
                      stroke: 'white',
                      strokeWidth: 2
                    }}
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
          {slices.map((slice, index) => (
            <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${slice.percentage < 5 ? 'bg-gray-50' : 'bg-white border border-gray-100'}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className={`font-medium truncate ${slice.percentage < 5 ? 'text-sm text-gray-600' : 'text-base text-gray-800'}`}>
                  {slice.label}
                </span>
                {slice.percentage < 5 && (
                  <span className="text-xs text-gray-400 ml-1"></span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className={`font-bold ${slice.percentage < 5 ? 'text-sm text-gray-700' : 'text-lg text-gray-900'}`}>
                  {slice.value.toLocaleString()}
                </span>
                <span className={`font-semibold ${slice.percentage < 5 ? 'text-sm text-gray-600' : 'text-base text-gray-700'} bg-gray-100 px-2 py-1 rounded`}>
                  {Math.round(slice.percentage)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}