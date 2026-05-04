"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type {
  Category,
  LedgerWithMembership,
  TransactionType,
} from "@/types/database";
import type {
  BankPreset,
  ColumnMapping,
  DateFormat,
  ImportResult,
  ImportRow,
} from "@/types/import";
import { parseCsv, looksLikeHeader, type CsvRow } from "@/lib/import/csv";
import {
  BANK_PRESETS,
  getPreset,
  guessMapping,
  normalizeAmount,
  normalizeDate,
} from "@/lib/import/banks";
import { suggestCategory } from "@/lib/import/categorize";

type Props = {
  ledgers: LedgerWithMembership[];
  categories: Category[];
};

const DATE_FORMATS: DateFormat[] = [
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "YYYY-MM-DD",
  "MM/DD/YYYY",
];

function formatMYR(n: number): string {
  return n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function buildRows(
  csvRows: CsvRow[],
  preset: BankPreset,
  mapping: ColumnMapping,
  dateFormat: DateFormat,
  hasHeader: boolean,
  skipRows: number,
  categories: Category[],
): ImportRow[] {
  const start = (hasHeader ? 1 : 0) + Math.max(0, skipRows);
  const data = csvRows.slice(start);

  const rows: ImportRow[] = [];
  for (const raw of data) {
    if (raw.length === 0 || raw.every((c) => c.trim() === "")) continue;

    const dateRaw = raw[mapping.date] ?? "";
    const descRaw = raw[mapping.description] ?? "";
    const refRaw =
      mapping.reference !== undefined ? (raw[mapping.reference] ?? "") : "";

    const txnDate = normalizeDate(dateRaw, dateFormat);
    let amount = 0;
    let type: TransactionType = "expense";

    if (mapping.amount !== undefined) {
      const signed = normalizeAmount(raw[mapping.amount] ?? "");
      type = signed >= 0 ? "income" : "expense";
      amount = Math.abs(signed);
    } else if (
      mapping.withdrawal !== undefined &&
      mapping.deposit !== undefined
    ) {
      const w = normalizeAmount(raw[mapping.withdrawal] ?? "");
      const d = normalizeAmount(raw[mapping.deposit] ?? "");
      if (w > 0 && d === 0) {
        amount = w;
        type = "expense";
      } else if (d > 0 && w === 0) {
        amount = d;
        type = "income";
      } else if (w > 0 && d > 0) {
        // Ambiguous — pick the larger
        amount = Math.max(w, d);
        type = w > d ? "expense" : "income";
      }
    }

    let parseError: string | undefined;
    if (!txnDate) parseError = "Bad date";
    else if (amount <= 0) parseError = "No amount";

    const description = [descRaw, refRaw].filter(Boolean).join(" · ").trim();
    const suggestion = suggestCategory(description, categories, type);
    const fallback =
      categories.find((c) => c.type === type) ?? categories[0] ?? null;

    rows.push({
      rowId: uid(),
      txnDate: txnDate ?? "",
      description,
      amount,
      type,
      categoryId: (suggestion ?? fallback)?.id ?? null,
      include: !parseError,
      raw,
      parseError,
    });
  }
  return rows;
}

export function CsvImport({ ledgers, categories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const writable = useMemo(
    () => ledgers.filter((l) => l.role === "owner" || l.role === "editor"),
    [ledgers],
  );

  const [ledgerId, setLedgerId] = useState<string>(
    () => writable[0]?.id ?? "",
  );
  const [presetId, setPresetId] = useState<string>("maybank");
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [hasHeader, setHasHeader] = useState(true);
  const [skipRows, setSkipRows] = useState(0);
  const [dateFormat, setDateFormat] = useState<DateFormat>("DD/MM/YYYY");
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: 0,
    description: 1,
    amount: 2,
  });
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preset = getPreset(presetId) ?? BANK_PRESETS[0];
  const columnCount = csvRows?.[0]?.length ?? 0;

  function applyPreset(id: string) {
    setPresetId(id);
    const p = getPreset(id);
    if (!p) return;
    setHasHeader(p.hasHeader);
    setDateFormat(p.dateFormat);
    setSkipRows(p.skipRows ?? 0);
    setMapping(p.mapping);
    if (csvRows) {
      setRows(
        buildRows(
          csvRows,
          p,
          p.mapping,
          p.dateFormat,
          p.hasHeader,
          p.skipRows ?? 0,
          categories,
        ),
      );
    }
  }

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvRows(parsed);

    // Try to auto-detect mapping from the header row
    const detectedHeader = looksLikeHeader(parsed[0]);
    setHasHeader(detectedHeader);
    let nextMapping = preset.mapping;
    if (detectedHeader && parsed[0]) {
      nextMapping = guessMapping(parsed[0]);
      setMapping(nextMapping);
    }
    setRows(
      buildRows(
        parsed,
        preset,
        nextMapping,
        preset.dateFormat,
        detectedHeader,
        preset.skipRows ?? 0,
        categories,
      ),
    );
  }

  function reparse() {
    if (!csvRows) return;
    setRows(
      buildRows(
        csvRows,
        preset,
        mapping,
        dateFormat,
        hasHeader,
        skipRows,
        categories,
      ),
    );
  }

  function reset() {
    setCsvRows(null);
    setFileName("");
    setRows([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function setRow(rowId: string, patch: Partial<ImportRow>) {
    setRows((rs) => rs.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  async function commit() {
    setError(null);
    setResult(null);
    if (!ledgerId) {
      setError("Pick a ledger first");
      return;
    }
    const valid = rows.filter(
      (r) => r.include && !r.parseError && r.categoryId,
    );
    if (valid.length === 0) {
      setError("No rows selected to import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId,
          rows: valid.map((r) => ({
            txnDate: r.txnDate,
            amount: r.amount,
            type: r.type,
            categoryId: r.categoryId!,
            note: r.description || null,
          })),
        }),
      });
      const json = (await res.json()) as {
        data: ImportResult | null;
        error: string | null;
      };
      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error ?? "Import failed");
      }
      setResult(json.data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const includedCount = rows.filter((r) => r.include && !r.parseError).length;
  const errorCount = rows.filter((r) => r.parseError).length;

  if (writable.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        You need at least one writable ledger to import transactions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step 1: ledger + bank */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            Import into ledger
          </span>
          <select
            value={ledgerId}
            onChange={(e) => setLedgerId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
          >
            {writable.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon ? `${l.icon} ` : ""}
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            Bank format
          </span>
          <select
            value={presetId}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
          >
            {BANK_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Step 2: file */}
      {!csvRows ? (
        <FileDropZone
          fileName={fileName}
          onFile={onFile}
          inputRef={fileInputRef}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <FileSpreadsheet
              className="h-4 w-4 text-primary"
              aria-hidden
            />
            <span className="truncate">{fileName}</span>
            <span className="text-xs text-muted-foreground">
              · {csvRows.length} rows · {columnCount} cols
            </span>
          </span>
          <button
            type="button"
            onClick={reset}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground"
            aria-label="Discard file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {csvRows && (
        <>
          {/* Step 3: column mapping */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
              Column mapping
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ColumnSelect
                label="Date"
                value={mapping.date}
                count={columnCount}
                preview={csvRows[0]}
                onChange={(v) => setMapping((m) => ({ ...m, date: v }))}
              />
              <ColumnSelect
                label="Description"
                value={mapping.description}
                count={columnCount}
                preview={csvRows[0]}
                onChange={(v) => setMapping((m) => ({ ...m, description: v }))}
              />
              <ColumnSelect
                label="Reference (optional)"
                value={mapping.reference ?? -1}
                count={columnCount}
                preview={csvRows[0]}
                onChange={(v) =>
                  setMapping((m) => ({
                    ...m,
                    reference: v < 0 ? undefined : v,
                  }))
                }
                allowNone
              />
              <ColumnSelect
                label="Amount (signed)"
                value={mapping.amount ?? -1}
                count={columnCount}
                preview={csvRows[0]}
                onChange={(v) =>
                  setMapping((m) => ({
                    ...m,
                    amount: v < 0 ? undefined : v,
                    withdrawal: v < 0 ? m.withdrawal : undefined,
                    deposit: v < 0 ? m.deposit : undefined,
                  }))
                }
                allowNone
              />
              <ColumnSelect
                label="Withdrawal / Debit"
                value={mapping.withdrawal ?? -1}
                count={columnCount}
                preview={csvRows[0]}
                onChange={(v) =>
                  setMapping((m) => ({
                    ...m,
                    withdrawal: v < 0 ? undefined : v,
                    amount: v < 0 ? m.amount : undefined,
                  }))
                }
                allowNone
              />
              <ColumnSelect
                label="Deposit / Credit"
                value={mapping.deposit ?? -1}
                count={columnCount}
                preview={csvRows[0]}
                onChange={(v) =>
                  setMapping((m) => ({
                    ...m,
                    deposit: v < 0 ? undefined : v,
                    amount: v < 0 ? m.amount : undefined,
                  }))
                }
                allowNone
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                First row is a header
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                Skip rows:
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={skipRows}
                  onChange={(e) =>
                    setSkipRows(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-14 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                Date format:
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={reparse}
                className="ml-auto cursor-pointer rounded-md border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-strong"
              >
                Re-parse
              </button>
            </div>
          </div>

          {/* Step 4: preview table */}
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-xs font-medium text-foreground">
                Preview · {includedCount} to import
                {errorCount > 0 && (
                  <span className="ml-2 text-warning">
                    ({errorCount} unparseable)
                  </span>
                )}
              </p>
              <p className="text-[11px] text-subtle-foreground">
                Uncheck any row you don&apos;t want imported
              </p>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-muted text-left text-[10px] uppercase tracking-wide text-subtle-foreground">
                  <tr>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.rowId}
                      className={[
                        "border-t border-border/50",
                        r.parseError ? "bg-[var(--negative-soft)]/40" : "",
                        !r.include ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={r.include}
                          disabled={!!r.parseError}
                          onChange={(e) =>
                            setRow(r.rowId, { include: e.target.checked })
                          }
                          className="h-3.5 w-3.5 accent-primary"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-foreground">
                        {r.txnDate || (
                          <span className="text-negative">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[280px]">
                        <span className="block truncate text-foreground">
                          {r.description || "(no description)"}
                        </span>
                        {r.parseError && (
                          <span className="text-[10px] text-negative">
                            {r.parseError}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={r.type}
                          onChange={(e) =>
                            setRow(r.rowId, {
                              type: e.target.value as TransactionType,
                              categoryId:
                                categories.find(
                                  (c) =>
                                    c.type ===
                                    (e.target.value as "income" | "expense"),
                                )?.id ?? null,
                            })
                          }
                          className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-foreground"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td
                        className={[
                          "px-3 py-2 text-right amount-sensitive font-semibold tabular-nums whitespace-nowrap",
                          r.type === "income"
                            ? "text-positive"
                            : "text-negative",
                        ].join(" ")}
                      >
                        {r.type === "income" ? "+" : "−"}
                        {formatMYR(r.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={r.categoryId ?? ""}
                          onChange={(e) =>
                            setRow(r.rowId, {
                              categoryId: e.target.value || null,
                            })
                          }
                          className="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-foreground"
                        >
                          <option value="">(none)</option>
                          {categories
                            .filter(
                              (c) =>
                                c.type ===
                                (r.type === "income" ? "income" : "expense"),
                            )
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon ? `${c.icon} ` : ""}
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 5: commit */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={commit}
              disabled={importing || includedCount === 0}
              className={[
                "inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                importing || includedCount === 0
                  ? "cursor-not-allowed bg-surface-muted text-subtle-foreground"
                  : "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover",
              ].join(" ")}
            >
              {importing && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {importing
                ? "Importing…"
                : `Import ${includedCount} transaction${includedCount === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
            >
              Cancel
            </button>
            {result && (
              <p className="ml-auto flex items-center gap-1.5 text-xs text-positive">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Imported {result.inserted}
                {result.skipped > 0 && ` · skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}`}
              </p>
            )}
            {error && (
              <p className="ml-auto flex items-center gap-1.5 text-xs text-negative">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FileDropZone({
  fileName,
  onFile,
  inputRef,
}: {
  fileName: string;
  onFile: (f: File) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={[
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-surface hover:border-primary/50 hover:bg-surface-muted",
      ].join(" ")}
    >
      <Upload
        className="h-6 w-6 text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm font-medium text-foreground">
        {fileName || "Drop your CSV here"}
      </p>
      <p className="text-[11px] text-muted-foreground">
        or click to browse · .csv files only
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function ColumnSelect({
  label,
  value,
  count,
  preview,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: number;
  count: number;
  preview: CsvRow | undefined;
  onChange: (v: number) => void;
  allowNone?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-[var(--ring)]"
      >
        {allowNone && <option value={-1}>(none)</option>}
        {Array.from({ length: count }, (_, i) => (
          <option key={i} value={i}>
            Column {i + 1}
            {preview && preview[i] ? ` — ${preview[i].slice(0, 24)}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
