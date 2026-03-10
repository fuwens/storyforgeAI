"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function StepNav({ activeStep }: { activeStep: number }) {
  const t = useTranslations("stepNav");

  const steps = [
    t("step1"),
    t("step2"),
    t("step3"),
    t("step4"),
    t("step5"),
    t("step6"),
    t("step7"),
  ];

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
