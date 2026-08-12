export const dashboardData = {
  cameras: [
    { id: 1, name: 'Camera 1', online: true, source: '/assets/gate-camera.svg', detectedTrucks: 18, queueCount: 3 },
    { id: 2, name: 'Camera 2', online: true, source: '/assets/gate-camera.svg', detectedTrucks: 11, queueCount: 2 },
    { id: 3, name: 'Camera 3', online: false, source: '/assets/gate-camera.svg', detectedTrucks: 7, queueCount: 1 },
  ],
  detections: [{ trackId: 18, label: 'Semi Trailer', confidence: .91, bbox: [.42, .28, .32, .38] }],
  countingLine: { x1: .16, y1: .72, x2: .86, y2: .72 },
  traffic: {
    day: 20, dayChange: 12, month: 475, monthChange: 12, utilization: 75,
    heatmap: Array.from({ length: 8 }, (_, row) => Array.from({ length: 13 }, (_, column) => {
      const ridge = 7 - row + 1.15;
      const distance = Math.abs(column - ridge);
      const centerBoost = 1 - Math.abs(column - 6.5) / 8;
      return Math.max(.03, Math.min(1, (1 - distance / 4.2) * centerBoost));
    })),
  },
  weights: {
    today: { title: 'Today Weight', value: 284, unit: 'Tons', percentage: 72, detail: 'of daily target' },
    month: { title: 'Month Weight', value: 7234, unit: 'Tons', percentage: 80, detail: 'of monthly target' },
  },
  invoices: {
    day: { label: 'Invoices / Day', value: 12, change: 9, comparison: 'vs. yesterday' },
    month: { label: 'Invoices / Month', value: 286, change: 14, comparison: 'vs. last month' },
  },
  activity: {
    '7D': [{label:'Mon',value:62},{label:'Tue',value:111},{label:'Wed',value:85},{label:'Thu',value:174},{label:'Fri',value:96},{label:'Sat',value:118},{label:'Sun',value:51}],
    '30D': [{label:'Jan',value:62},{label:'Feb',value:111},{label:'Mar',value:104},{label:'Apr',value:174},{label:'May',value:96},{label:'Jun',value:118},{label:'Jul',value:51}],
    '90D': [{label:'May',value:74},{label:'Jun',value:93},{label:'Jul',value:127},{label:'Aug',value:101},{label:'Sep',value:153},{label:'Oct',value:86},{label:'Nov',value:64}],
  },
  kpis: [
    { subject: 'Throughput', value: 78 }, { subject: 'Accuracy', value: 61 },
    { subject: 'Billing', value: 72 }, { subject: 'Utilization', value: 66 },
  ],
};
