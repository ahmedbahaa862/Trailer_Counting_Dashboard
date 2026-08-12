import { dashboardData as phaseTwoData } from './dashboardMockData';

// Temporary compatibility shape for the existing panels while Phase 2 components
// are migrated. The source of truth remains dashboardMockData.js.
export const dashboardData = {
  ...phaseTwoData,
  detectedTrucks: phaseTwoData.cameras[0].detectedTrucks,
  currentQueue: phaseTwoData.cameras[0].queueCount,
  time: '',
  traffic: {
    daily: { value: phaseTwoData.traffic.day, change: `+${phaseTwoData.traffic.dayChange}%`, comparison: 'vs. yesterday' },
    monthly: { value: phaseTwoData.traffic.month, change: `+${phaseTwoData.traffic.monthChange}%`, comparison: 'vs. last month' },
    utilization: phaseTwoData.traffic.utilization,
  },
  heatmap: phaseTwoData.traffic.heatmap.flat().map((value) => Math.round(value * 7)),
  weights: Object.values(phaseTwoData.weights).map((item) => ({
    label: item.title, value: item.value.toLocaleString('en-US'), unit: item.unit,
    progress: item.percentage, detail: item.detail,
  })),
  invoices: Object.values(phaseTwoData.invoices).map((item) => ({
    label: item.label, value: item.value, change: `▲ ${item.change}%`, detail: item.comparison,
  })),
  trend: phaseTwoData.activity['30D'].map((item) => item.value),
  trendLabels: phaseTwoData.activity['30D'].map((item) => item.label),
  kpis: phaseTwoData.kpis.map((item) => item.value),
};
