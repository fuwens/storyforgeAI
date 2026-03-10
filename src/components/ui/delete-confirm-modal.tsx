"use client";

import { useEffect, useRef, useState } from "react";

type DeleteConfirmModalProps = {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

export function DeleteConfirmModal({
  isOpen,
  projectName,
  onConfirm,
  onCancel,
  loading,
}: DeleteConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isMatch = inputValue === projectName;

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        {/* Warning icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h3 className="mb-2 text-center text-lg font-semibold text-white">
          删除项目
        </h3>

        <p className="mb-1 text-center text-sm text-slate-300">
          此操作不可撤销，将永久删除项目及所有相关数据。
        </p>

        <p className="mb-4 text-center text-sm text-slate-400">
          请输入项目名称 <span className="font-bold text-white">{projectName}</span> 以确认删除。
        </p>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入项目名称以确认"
          disabled={loading}
          className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-400/50 disabled:opacity-50"
        />

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch || loading}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {loading ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}
