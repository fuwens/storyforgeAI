import { cn } from "@/lib/utils";

const steps = [
  "1. 主题",
  "2. 脚本",
  "3. 分镜",
  "4. Prompt",
  "5. 配置",
  "6. 任务",
  "7. 审核",
];

export function StepNav({ activeStep }: { activeStep: number }) {
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {steps.map((step, index) => {
        const active = index <= activeStep;
        return (
          <div
            key={step}
            className={cn(
              "rounded-2xl border px-3 py-2 text-sm transition",
              active
                ? "border-indigo-300/40 bg-indigo-400/15 text-white"
                : "border-white/10 bg-white/5 text-slate-400",
            )}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}
