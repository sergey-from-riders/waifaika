import { CheckCircledIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

import type { Toast } from "@/app/ui-models";
import { cn } from "@/lib/utils";

export function ToastBanner({ toast }: { toast: Toast }) {
  const config = {
    info: { icon: <ExclamationTriangleIcon />, className: "bg-slate-900 text-white" },
    success: { icon: <CheckCircledIcon />, className: "bg-emerald-600 text-white" },
    error: { icon: <Cross2Icon />, className: "bg-rose-600 text-white" },
  }[toast.tone];

  return (
    <div className={cn("fixed left-1/2 top-4 z-[60] flex max-w-[22rem] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold", config.className)}>
      {config.icon}
      {toast.message}
    </div>
  );
}
