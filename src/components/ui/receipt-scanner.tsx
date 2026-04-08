"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileImage, Layers, XCircle } from "lucide-react";
import type { ExtractedReceipt } from "@/types/database";
import { compressImage } from "@/lib/image-utils";

type Props = {
  /**
   * Called once with all successfully extracted receipts after a scan
   * (or batch scan) finishes. Always an array — single uploads pass a
   * one-element array so the parent can use a single queue model.
   */
  onExtracted: (data: ExtractedReceipt[]) => void;
  onError: (message: string) => void;
};

type Status = "idle" | "processing" | "error";
type Mode = "single" | "camera" | "batch";

type Progress = { done: number; total: number };

export function ReceiptScanner({ onExtracted, onError }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<Mode>("single");

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function reset() {
    setStatus("idle");
    setPreview(null);
    setErrorMessage(null);
    setProgress({ done: 0, total: 0 });
  }

  function showErrorBriefly(message: string) {
    setErrorMessage(message);
    setStatus("error");
    onError(message);
    setTimeout(reset, 2500);
  }

  function pickFiles(mode: Mode) {
    modeRef.current = mode;
    const input = inputRef.current;
    if (!input) return;
    input.multiple = mode === "batch";
    if (mode === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    setMenuOpen(false);
    input.click();
  }

  async function scanOne(file: File): Promise<ExtractedReceipt | null> {
    let compressed: string;
    try {
      compressed = await compressImage(file, 1200, 0.85);
    } catch {
      return null;
    }
    try {
      const res = await fetch("/api/receipt/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: compressed,
          mimeType: "image/jpeg",
        }),
      });
      const json = (await res.json()) as {
        data: ExtractedReceipt | null;
        error: string | null;
      };
      if (!res.ok || json.error || !json.data) return null;
      return json.data;
    } catch {
      return null;
    }
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setStatus("processing");
    setErrorMessage(null);
    setProgress({ done: 0, total: files.length });

    // Show preview from the first file.
    try {
      const previewUrl = await readAsDataUrl(files[0]);
      setPreview(previewUrl);
    } catch {
      // non-fatal
    }

    const results: ExtractedReceipt[] = [];
    // Process sequentially so progress is meaningful and we don't slam
    // the API with parallel calls. For typical batch sizes (≤10) this
    // is plenty fast.
    for (let i = 0; i < files.length; i++) {
      const item = await scanOne(files[i]);
      if (item) results.push(item);
      setProgress({ done: i + 1, total: files.length });
    }

    if (results.length === 0) {
      showErrorBriefly(
        files.length === 1
          ? "Could not read receipt"
          : "No receipts could be read",
      );
      return;
    }

    onExtracted(results);
    reset();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    const files = list ? Array.from(list) : [];
    e.target.value = "";
    if (files.length === 0) return;
    void handleFiles(files);
  }

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          title="Scan receipt"
          aria-label="Scan receipt"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/60 text-foreground transition-colors hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
        >
          <Camera size={20} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 top-11 z-[55] w-52 overflow-hidden rounded-xl border border-border bg-surface/95 p-1 text-sm shadow-[var(--shadow-elevated)] backdrop-blur-xl"
          >
            <MenuItem
              icon={<Camera size={16} />}
              label="Take photo"
              hint="Use camera"
              onClick={() => pickFiles("camera")}
            />
            <MenuItem
              icon={<FileImage size={16} />}
              label="Choose file"
              hint="Single image"
              onClick={() => pickFiles("single")}
            />
            <MenuItem
              icon={<Layers size={16} />}
              label="Batch upload"
              hint="Multiple receipts"
              onClick={() => pickFiles("batch")}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={onFileChange}
        className="hidden"
      />

      {(status === "processing" || status === "error") && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex w-[280px] flex-col items-center gap-3 rounded-2xl bg-neutral-900/90 p-5 shadow-2xl">
            {status === "processing" && (
              <>
                {preview && (
                  <div className="relative overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="max-h-[120px] w-auto rounded-lg"
                    />
                    <div className="receipt-scan-line pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.8)]" />
                  </div>
                )}
                <p className="text-[14px] font-medium text-white">
                  {progress.total > 1
                    ? `Reading receipt ${Math.max(progress.done, 1)} of ${progress.total}...`
                    : "Reading receipt..."}
                </p>
                <p className="text-[12px] text-white/50">
                  {progress.total > 1
                    ? "Hang tight while we scan the batch"
                    : "This takes a few seconds"}
                </p>
                {progress.total > 1 && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, (progress.done / progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {status === "error" && (
              <>
                <XCircle size={36} className="text-red-400" />
                <p className="text-center text-[14px] text-white">
                  {errorMessage ?? "Something went wrong"}
                </p>
              </>
            )}
          </div>

          <style jsx>{`
            .receipt-scan-line {
              animation: receipt-sweep 1.6s ease-in-out infinite;
            }
            @keyframes receipt-sweep {
              0% {
                transform: translateY(0);
                opacity: 0.9;
              }
              50% {
                transform: translateY(110px);
                opacity: 1;
              }
              100% {
                transform: translateY(0);
                opacity: 0.9;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-foreground transition-colors hover:bg-surface-muted"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-[11px] text-subtle-foreground">{hint}</span>
      </span>
    </button>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
