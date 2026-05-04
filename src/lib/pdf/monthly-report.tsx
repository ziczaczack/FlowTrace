import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Svg,
  Path,
  Rect,
} from "@react-pdf/renderer";
import type { MonthlyReport } from "@/types/database";

/**
 * One-page PDF rendition of a MonthlyReport. Layout intentionally mirrors
 * the on-screen MonthlyReportCard but stretched out to fill an A4 page —
 * this is the kind of artifact that needs to look right when printed.
 *
 * Notes:
 * - @react-pdf/renderer doesn't run Tailwind. Every style is inline.
 * - Built-in fonts only (Helvetica family). No webfonts to keep the bundle
 *   light and avoid flaky font-fetching on serverless cold starts.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatMYR = (n: number) =>
  `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    color: "#0f172a",
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 9, color: "#64748b", letterSpacing: 1.6 },
  brandTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  reportLabel: { fontSize: 9, color: "#64748b", letterSpacing: 1.4 },
  monthHeading: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 4,
    marginBottom: 4,
  },
  generatedAt: { fontSize: 9, color: "#64748b" },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 18,
  },
  pillRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  pill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pillLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
  },
  pillValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  catRank: { width: 20, color: "#94a3b8" },
  catName: { flex: 1, color: "#0f172a" },
  catPct: {
    width: 50,
    textAlign: "right",
    color: "#64748b",
  },
  catTotal: {
    width: 90,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  anomalyBox: {
    borderWidth: 0.6,
    borderColor: "#f59e0b",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  anomalyTitle: {
    fontFamily: "Helvetica-Bold",
    color: "#b45309",
    fontSize: 10,
  },
  anomalyDetail: { color: "#78350f", marginTop: 2, fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 8,
  },
});

type Props = {
  report: MonthlyReport;
  /** ISO timestamp the report was rendered (defaults to "now"). */
  generatedAt?: string;
};

export function MonthlyReportPdf({ report, generatedAt }: Props) {
  const monthLabel = `${MONTH_NAMES[report.month - 1]} ${report.year}`;
  const stamp = new Date(generatedAt ?? Date.now()).toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const breakdown = report.categoryBreakdown.slice(0, 10);

  return (
    <Document
      title={`FlowTrace · ${monthLabel}`}
      author="FlowTrace"
      subject="Monthly report"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Svg viewBox="0 0 64 64" width={18} height={18}>
                <Path
                  d="M14 42 L26 30 L34 38 L50 22"
                  stroke="#ffffff"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Path
                  d="M36 22 H50 V36"
                  stroke="#ffffff"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
            <View>
              <Text style={styles.brandText}>FLOWTRACE</Text>
              <Text style={styles.brandTitle}>Monthly report</Text>
            </View>
          </View>
          <Text style={styles.reportLabel}>{stamp}</Text>
        </View>

        <Text style={styles.monthHeading}>{monthLabel}</Text>
        <Text style={styles.generatedAt}>
          {report.categoryBreakdown.length} categories tracked · net{" "}
          {report.netFlow >= 0 ? "surplus" : "deficit"} of{" "}
          {formatMYR(Math.abs(report.netFlow))}
        </Text>

        <View style={styles.divider} />

        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: "#ecfdf5" }]}>
            <Text style={[styles.pillLabel, { color: "#059669" }]}>INCOME</Text>
            <Text style={[styles.pillValue, { color: "#059669" }]}>
              {formatMYR(report.totalIncome)}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: "#fef2f2" }]}>
            <Text style={[styles.pillLabel, { color: "#b91c1c" }]}>
              EXPENSES
            </Text>
            <Text style={[styles.pillValue, { color: "#b91c1c" }]}>
              {formatMYR(report.totalExpense)}
            </Text>
          </View>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: report.netFlow >= 0 ? "#ecfdf5" : "#fef2f2",
              },
            ]}
          >
            <Text
              style={[
                styles.pillLabel,
                { color: report.netFlow >= 0 ? "#059669" : "#b91c1c" },
              ]}
            >
              NET FLOW
            </Text>
            <Text
              style={[
                styles.pillValue,
                { color: report.netFlow >= 0 ? "#059669" : "#b91c1c" },
              ]}
            >
              {report.netFlow >= 0 ? "+" : "-"}
              {formatMYR(Math.abs(report.netFlow))}
            </Text>
          </View>
        </View>

        {breakdown.length > 0 && (
          <View>
            <Text style={styles.sectionLabel}>TOP SPENDING</Text>
            {breakdown.map((c, i) => {
              const pct =
                report.totalExpense > 0
                  ? (c.total / report.totalExpense) * 100
                  : 0;
              return (
                <View key={c.categoryId} style={styles.catRow}>
                  <Text style={styles.catRank}>{i + 1}.</Text>
                  <Text style={styles.catName}>
                    {c.icon ? `${c.icon}  ` : ""}
                    {c.name}
                  </Text>
                  <Text style={styles.catPct}>{pct.toFixed(0)}%</Text>
                  <Text style={styles.catTotal}>{formatMYR(c.total)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {report.anomalies.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionLabel}>FLAGGED CATEGORIES</Text>
            {report.anomalies.map((a) => (
              <View key={a.categoryName} style={styles.anomalyBox}>
                <Text style={styles.anomalyTitle}>
                  {a.categoryName} +{Math.round(a.percentageOver)}% above usual
                </Text>
                <Text style={styles.anomalyDetail}>
                  {formatMYR(a.currentSpend)} this month vs{" "}
                  {formatMYR(a.average)} 3-month average
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <Svg height={4} width="100%">
            <Rect x={0} y={0} width="100%" height={4} fill="#10b981" />
          </Svg>
        </View>

        <View style={styles.footer} fixed>
          <Text>flowtrace · personal finance, finally calm</Text>
          <Text>{monthLabel}</Text>
        </View>
      </Page>
    </Document>
  );
}
