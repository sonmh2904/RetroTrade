import { Button } from '@/components/ui/common/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/common/dialog';

import { TreeState } from './useBambooGame';

type BambooControlPanelProps = {
  tree: TreeState;
  notice: string | null;
  pending: boolean;
  onWater: () => void;
  onFertilize: () => void;
  onReset: () => void;
  isResetDialogOpen: boolean;
  setIsResetDialogOpen: (open: boolean) => void;
  handleConfirmReset: () => void;
};

export function BambooControlPanel({ 
  tree, 
  notice, 
  pending, 
  onWater, 
  onFertilize, 
  onReset,
  isResetDialogOpen,
  setIsResetDialogOpen,
  handleConfirmReset,
}: BambooControlPanelProps) {
  const isMaxLevel = tree.stage >= 5;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-white/90 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Cấp độ</div>
          <div className="text-3xl font-semibold text-slate-900">{tree.stage}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white/90 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Tăng trưởng</div>
          <div className="text-3xl font-semibold text-emerald-600">{tree.growth}%</div>
        </div>
      </div>

      {notice && (
        <div className={`rounded-lg border p-3 text-sm ${
          notice.includes('🎉') || notice.includes('Chúc mừng')
            ? 'border-green-300 bg-green-50/90 text-green-800'
            : 'border-amber-200 bg-amber-50/90 text-amber-800'
        }`}>
          {notice}
        </div>
      )}

      {isMaxLevel && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/90 p-3 text-sm text-purple-800">
          🎊 Cây của bạn đã đạt mức tối đa! Nhấn nút &quot;Trồng lại cây mới&quot; để bắt đầu trồng cây mới và nhận lại phần thưởng.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onWater}
          disabled={pending || isMaxLevel}
          className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-60"
        >
          Tưới nước (+10)
        </Button>
        <Button
          onClick={onFertilize}
          disabled={pending || isMaxLevel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-60"
        >
          Bón phân (+25)
        </Button>
        {isMaxLevel && (
          <Button
            onClick={onReset}
            disabled={pending}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-60"
          >
            🌱 Trồng lại cây mới
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Thời gian chờ tưới nước: 4 giờ. Thời gian chờ bón phân: 24 giờ.
      </p>

      {/* Dialog xác nhận trồng lại cây mới */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Xác nhận trồng lại cây mới
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Bạn có chắc chắn muốn trồng lại cây mới? Cây hiện tại sẽ được thay thế và bạn sẽ có thể bắt đầu trồng từ đầu để nhận lại phần thưởng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={pending}
              className="sm:mr-2"
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmReset}
              disabled={pending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {pending ? 'Đang xử lý...' : 'Xác nhận trồng lại'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


