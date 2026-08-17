import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './components/dashboard/Icon';
import GlowyDivider from './components/dashboard/GlowyDivider';
import KpiOverviewFrame from './components/dashboard/KpiOverviewFrame';
import { dashboardData } from './data/dashboardMockData';
import useDashboardStream, { cameraStreamUrl, discoverCameras, saveCameraConfig } from './hooks/useDashboardStream';

/* The dashboard is authored on a fixed 1920 x 1080 grid and scaled onto the
 * viewport, so every element keeps identical proportions and positions
 * relative to the background frame in and out of fullscreen. */
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const cameras = [
  { id: 1, name: 'Camera 1', connected: true, source: '/assets/camera-yard.png', detectedTrucks: 18, queueCount: 3 },
  { id: 2, name: 'Camera 2', connected: true, source: '/assets/camera-yard.png', detectedTrucks: 12, queueCount: 2 },
  { id: 3, name: 'Camera 3', connected: false, source: '/assets/camera-yard.png', detectedTrucks: 0, queueCount: 0 },
];

const weightData = [
  {
    id: 'today', title: 'Today Weight', value: 284, unit: 'Tons', percentage: 72, targetLabel: 'of daily target',
    gradient: { start: '#10D4F3', middle: '#1aeb9b', end: '#53fbc3' },
    percentColor: '#15E0C7',
  },
  {
    id: 'month', title: 'Month Weight', value: 7234, unit: 'Tons', percentage: 80, targetLabel: 'of monthly target',
    gradient: { start: '#00E5FF', middle: '#2E3192', end: '#8B5CF6' },
  },
];

const invoiceData = {
  title: 'Invoice Summary',
  metrics: [
    { id: 'day', label: 'Invoices / Day', value: 12, change: 9, comparison: 'vs. yesterday' },
    { id: 'month', label: 'Invoices / Month', value: 286, change: 14, comparison: 'vs. last month' },
  ],
};

const activityData = {
  '7D': [
    { label: 'Mon', value: 48 }, { label: 'Tue', value: 76 }, { label: 'Wed', value: 118 },
    { label: 'Thu', value: 94 }, { label: 'Fri', value: 156 }, { label: 'Sat', value: 132 }, { label: 'Sun', value: 61 },
  ],
  '30D': [
    { label: 'Jan', value: 58 }, { label: 'Feb', value: 96 }, { label: 'Mar', value: 142 },
    { label: 'Apr', value: 128 }, { label: 'May', value: 168 }, { label: 'Jun', value: 154 }, { label: 'Jul', value: 186 },
  ],
  '90D': [
    { label: 'May', value: 72 }, { label: 'Jun', value: 108 }, { label: 'Jul', value: 94 },
    { label: 'Aug', value: 148 }, { label: 'Sep', value: 136 }, { label: 'Oct', value: 172 }, { label: 'Nov', value: 158 },
  ],
};

/* Axis order drives the spider layout: top, right, bottom, left. */
const kpiData = [
  { subject: 'Throughput', value: 78 },
  { subject: 'Accuracy', value: 58 },
  { subject: 'Billing', value: 72 },
  { subject: 'Utilization', value: 64 },
];

const kpiRelations = [
  { pair: 'Throughput ↔ Accuracy', detail: '+8% divergence', trend: 'down' },
  { pair: 'Billing ↔ Utilization', detail: 'Strong Correlation', trend: 'up' },
  { pair: 'Throughput ↔ Utilization', detail: '+14% gap', trend: 'down' },
];

function CameraIcon() {
  return <img className="camera-icon" src="/assets/cctv.png" alt="" aria-hidden="true" />;
}

function CameraStatus({ connected }) {
  return (
    <span className={`camera-status ${connected ? 'connected' : 'offline'}`}>
      <i />{connected ? 'Connected' : 'Offline'}
    </span>
  );
}

function CameraButton({ camera, active, onSelect }) {
  return (
    <button
      type="button"
      className={`camera-button ${active ? 'active' : ''}`}
      onClick={() => onSelect(camera.id)}
      aria-pressed={active}
    >
      <CameraIcon />
      <span className="text-keys">{camera.name}</span>
      <i className={camera.connected ? 'online-dot' : 'offline-dot'} />
    </button>
  );
}

function MetricIcon({ type }) {
  if (type === 'truck') return <img src="/assets/truck.png" alt="" aria-hidden="true" />;
  if (type === 'queue') return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="7" r="3"/><circle cx="24" cy="9" r="3"/><path d="M3 25v-6c0-3 2-5 5-5s5 2 5 5v6M19 25v-6c0-3 2-5 5-5s5 2 5 5v6M11 25v-8c0-3 2-5 5-5s5 2 5 5v8"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12"/><path d="M16 8v9l6 3"/></svg>;
}

function CameraMetrics({ camera }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="camera-metrics">
    <div className="camera-metric"><MetricIcon type="truck" /><span className="data-value">Detected trucks: <strong>{camera.detectedTrucks}</strong></span></div>
    <div className="camera-metric"><MetricIcon type="queue" /><span className="data-value">Current Queue: <strong>{camera.queueCount}</strong> Vehicles</span></div>
    <div className="camera-metric time"><MetricIcon type="time" /><span className="data-value">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  </div>;
}

/* Flip back to true to restore the animated glow underline below every title. */
const SHOW_TITLE_DIVIDERS = false;

function TitleWithDivider({ className = '', rowClassName = '', children }) {
  return (
    <div className={`title-with-divider ${className}`}>
      <div className={`title-with-divider-row ${rowClassName}`}>{children}</div>
      {SHOW_TITLE_DIVIDERS && <GlowyDivider />}
    </div>
  );
}

function LiveFeedUptime({ uptime = 99.8, since = '7:30 AM' }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, uptime)) / 100);

  return (
    <article className="live-feed-uptime" aria-label={`Live feed uptime ${uptime}% since ${since}`}>
      <h3>Live Feed Uptime</h3>
      <div className="uptime-gauge">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="uptime-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0b7d8c" />
              <stop offset=".45" stopColor="#00d5e0" />
              <stop offset="1" stopColor="#7fffff" />
            </linearGradient>
            <filter id="uptime-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle className="uptime-track" cx="50" cy="50" r={radius} />
          <circle
            className="uptime-value"
            cx="50"
            cy="50"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="uptime-reading">
          <strong>{uptime}%</strong>
          <span>Uptime</span>
        </div>
      </div>
      <p className="uptime-since">
        Since {since}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 7.2v4M8 4.8h.01" />
        </svg>
      </p>
    </article>
  );
}

function CCTVPanel({ cameraData = cameras }) {
  const [selectedCameraId, setSelectedCameraId] = useState(1);
  const selectedCamera = cameraData.find(({ id }) => id === selectedCameraId) || cameraData[0];

  return (
    <section className="cctv-panel" aria-label="CCTV cameras">
      <header className="camera-heading">
        <TitleWithDivider className="camera-title-shift" rowClassName="camera-title">
          <CameraIcon /><h1 className="text-keys frame-title">Live Camera View</h1>
          <CameraStatus connected={selectedCamera.connected} />
        </TitleWithDivider>
      </header>

      <div className="camera-layout">
        <div className={`camera-viewport ${selectedCamera.connected ? '' : 'is-offline'}`}>
          <img src={selectedCamera.source} alt={`${selectedCamera.name} CCTV view`} />
          <div className="camera-nameplate">{selectedCamera.name}</div>
          {!selectedCamera.connected && <div className="offline-message">Camera offline</div>}
          <CameraMetrics camera={selectedCamera} />
        </div>

        <div className="camera-sidebar">
          <nav className="camera-selector" aria-label="Select camera">
            {cameraData.map((camera) => (
              <CameraButton
                key={camera.id}
                camera={camera}
                active={camera.id === selectedCameraId}
                onSelect={setSelectedCameraId}
              />
            ))}
          </nav>
          <LiveFeedUptime />
        </div>
      </div>
    </section>
  );
}

function mixHex(from, to, ratio) {
  const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const [r1, g1, b1] = channels(from);
  const [r2, g2, b2] = channels(to);
  const blend = (a, b) => Math.round(a + (b - a) * ratio).toString(16).padStart(2, '0');
  return `#${blend(r1, r2)}${blend(g1, g2)}${blend(b1, b2)}`;
}

/* Spread over the lit segments only, so all three stops always show up
 * regardless of how far the needle has travelled. */
function gradientStop({ start, middle, end }, ratio) {
  return ratio <= 0.5 ? mixHex(start, middle, ratio * 2) : mixHex(middle, end, (ratio - 0.5) * 2);
}

function WeightGauge({ title, value, unit, percentage, targetLabel, gradient, percentColor }) {
  const safePercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const segmentCount = 26;
  const activeSegments = Math.round((safePercentage / 100) * segmentCount);
  const indicatorAngle = (180 + (safePercentage / 100) * 180) * Math.PI / 180;
  const indicator = {
    x1: 110 + Math.cos(indicatorAngle) * 57,
    y1: 106 + Math.sin(indicatorAngle) * 57,
    x2: 110 + Math.cos(indicatorAngle) * 83,
    y2: 106 + Math.sin(indicatorAngle) * 83,
  };

  const gradientVars = {
    '--gauge-start': gradient.start,
    '--gauge-middle': gradient.middle,
    '--gauge-end': gradient.end,
    ...(percentColor ? { '--percent-color': percentColor } : {}),
  };

  return <section className="weight-gauge" style={gradientVars} aria-label={`${title}: ${value} ${unit}`}>
    <header>
      <TitleWithDivider>
        <img src="/assets/weight1.png" alt="" aria-hidden="true" /><h2 className="text-keys frame-title">{title}</h2>
      </TitleWithDivider>
    </header>
    <div className="gauge-visual">
      <svg viewBox="0 0 220 135" role="img" aria-label={`${safePercentage}% of target`}>
        <g className="gauge-segments">
          {Array.from({ length: segmentCount }, (_, index) => {
            const angle = 180 + (index / (segmentCount - 1)) * 180;
            const radians = angle * Math.PI / 180;
            const x1 = 110 + Math.cos(radians) * 82;
            const y1 = 106 + Math.sin(radians) * 82;
            const x2 = 110 + Math.cos(radians) * 98;
            const y2 = 106 + Math.sin(radians) * 98;
            const active = index < activeSegments;
            const tint = active ? gradientStop(gradient, activeSegments > 1 ? index / (activeSegments - 1) : 0) : null;
            return <line
              key={index}
              className={active ? 'active' : ''}
              style={active ? { stroke: tint, color: tint } : undefined}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
            />;
          })}
        </g>
        <line className="gauge-needle" {...indicator} />
      </svg>
      <div className="gauge-reading"><strong className="data-value">{Number(value).toLocaleString('en-US')}</strong><span className="data-value">{unit}</span></div>
    </div>
    <p className="data-value"><strong>{safePercentage}%</strong><span>{targetLabel}</span></p>
  </section>;
}

function InvoiceMetric({ label, value, change, comparison }) {
  const numericChange = Number(change) || 0;
  const positive = numericChange >= 0;

  return <article className="invoice-metric">
    <h3 className="text-keys">{label}</h3>
    <div className="invoice-value-row">
      <strong className="data-value">{Number(value).toLocaleString('en-US')}</strong>
      <span className={`data-value ${positive ? 'positive' : 'negative'}`}>
        <i>{positive ? '▲' : '▼'}</i>{Math.abs(numericChange)}%
      </span>
    </div>
    <p className="data-value">{comparison}</p>
    <div className="invoice-axis" aria-hidden="true" />
    <div className="hologram" aria-hidden="true"><i /><i /><i /></div>
  </article>;
}

function InvoiceSummary({ title, metrics }) {
  return <section className="invoice-summary" aria-label={title}>
    <header>
      <TitleWithDivider>
        <img src="/assets/invoice.png" alt="" aria-hidden="true" /><h2 className="text-keys frame-title">{title}</h2>
      </TitleWithDivider>
      <svg className="circuit-decoration" viewBox="0 0 180 34" aria-hidden="true"><path d="M4 25h45l12-12h56l8-8h49"/><circle cx="4" cy="25" r="3"/><circle cx="61" cy="13" r="3"/><circle cx="125" cy="5" r="3"/><circle cx="174" cy="5" r="3"/></svg>
    </header>
    <div className="invoice-metrics">
      {metrics.map((metric) => <InvoiceMetric key={metric.id} {...metric} />)}
    </div>
  </section>;
}

function smoothPath(points) {
  if (points.length < 2) return '';
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const before = points[index - 1] || previous;
    const after = points[index + 2] || point;
    const controlOneX = previous.x + (point.x - before.x) / 6;
    const controlOneY = previous.y + (point.y - before.y) / 6;
    const controlTwoX = point.x - (after.x - previous.x) / 6;
    const controlTwoY = point.y - (after.y - previous.y) / 6;
    return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function GlassTab({ label, active, onClick }) {
  return (
    <button type="button" className={`glass-tab ${active ? 'is-active' : ''}`} onClick={onClick} aria-pressed={active}>
      <span>{label}</span>
    </button>
  );
}

function TruckActivityTrend({ datasets, initialRange = '30D' }) {
  const [range, setRange] = useState(initialRange);
  const data = datasets[range] || [];
  const plot = { left: 67, right: 690, top: 18, bottom: 318 };
  const maxValue = 200;
  const points = data.map((item, index) => ({
    ...item,
    x: plot.left + (index * (plot.right - plot.left)) / Math.max(data.length - 1, 1),
    y: plot.bottom - (Math.min(item.value, maxValue) / maxValue) * (plot.bottom - plot.top),
  }));
  const linePath = smoothPath(points);
  const areaPath = points.length ? `${linePath} L ${points.at(-1).x} ${plot.bottom} L ${points[0].x} ${plot.bottom} Z` : '';
  const current = data.at(-1)?.value ?? 0;

  return <section className="activity-trend" aria-label="Truck Activity Trend">
    <header>
      <TitleWithDivider rowClassName="trend-title">
        <Icon name="trend" className="trend-heading-icon" /><h2 className="text-keys frame-title">Truck Activity Trend</h2>
      </TitleWithDivider>
    </header>
    <div className="trend-toolbar">
      <div className="range-selector" aria-label="Activity period">
        {Object.keys(datasets).map((option) => (
          <GlassTab key={option} label={option} active={range === option} onClick={() => setRange(option)} />
        ))}
      </div>
      <div className="trend-current">
        <span className="data-value">{current} trucks</span>
        <i />
      </div>
    </div>
    <svg className="activity-chart" viewBox="0 0 720 360" role="img" aria-label={`${range} truck activity chart`}>
      <defs>
        <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0dfbfa" stopOpacity=".18" />
          <stop offset="1" stopColor="#0dfbfa" stopOpacity=".02" />
        </linearGradient>
      </defs>
      {[0, 50, 100, 150, 200].map((value) => {
        const y = plot.bottom - (value / maxValue) * (plot.bottom - plot.top);
        return <text className="data-value trend-y-label" key={value} x="45" y={y + 4} textAnchor="end">{value || ''}</text>;
      })}
      <line className="trend-axis" x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom}/>
      <line className="trend-axis" x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom}/>
      <path d={areaPath} fill="url(#activity-area)"/>
      <path className="activity-line" d={linePath}/>
      {points.map((point) => <text className="data-value trend-x-label" key={point.label} x={point.x} y="348" textAnchor="middle">{point.label}</text>)}
    </svg>
  </section>;
}

function KPIOverview({ data, relations = kpiRelations, maxValue = 100 }) {
  const metrics = data.map(({ subject, value }) => ({
    label: subject,
    value: Math.max(0, Math.min(maxValue, Number(value) || 0)),
    unit: '%',
    baseline: maxValue,
  }));

  return <section className="kpi-overview" aria-label="KPI Overview">
    <header>
      <TitleWithDivider>
        <Icon name="kpi" className="kpi-heading-icon" /><h2 className="text-keys frame-title">KPI Overview</h2>
      </TitleWithDivider>
    </header>
    <KpiOverviewFrame metrics={metrics} relations={relations} />
  </section>;
}

function TrafficMetric({ icon, label, value, change, comparison }) {
  const positive = Number(change) >= 0;
  return <article className="traffic-metric">
    <div className="traffic-metric-title"><Icon name={icon} /><h3 className="text-keys">{label}</h3></div>
    <strong className="data-value">{Number(value).toLocaleString('en-US')}</strong>
    <p className="data-value"><span className={positive ? 'positive' : 'negative'}>{positive ? '+' : ''}{change}%</span><span>{comparison}</span></p>
  </article>;
}

function UtilizationBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="traffic-utilization">
    <div><h3 className="text-keys">Truck Utilization</h3><strong className="data-value">{safeValue}%</strong></div>
    <div className="utilization-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={safeValue}><i style={{ width: `${safeValue}%` }} /></div>
  </div>;
}

/* Idle/Low (cyan) → Moderate (blue) → High yellow → Peak red. */
const HEAT_STOPS = [
  [0, [1, 168, 251]],
  [0.25, [2, 185, 189]],
  [0.5, [0, 120, 240]],
  [0.78, [244, 178, 58]],
  [1, [250, 43, 51]],
];

function heatColor(value) {
  const x = Math.max(0, Math.min(1, value));
  let from = HEAT_STOPS[0][1];
  let to = HEAT_STOPS[1][1];
  let lo = 0;
  let hi = 1;
  for (let index = 0; index < HEAT_STOPS.length - 1; index += 1) {
    if (x >= HEAT_STOPS[index][0] && x <= HEAT_STOPS[index + 1][0]) {
      from = HEAT_STOPS[index][1];
      to = HEAT_STOPS[index + 1][1];
      lo = HEAT_STOPS[index][0];
      hi = HEAT_STOPS[index + 1][0];
      break;
    }
  }
  const mix = (x - lo) / (hi - lo || 1);
  const channel = (a, b) => Math.round(a + (b - a) * mix);
  return `rgb(${channel(from[0], to[0])},${channel(from[1], to[1])},${channel(from[2], to[2])})`;
}

const HEAT_LEGEND = `linear-gradient(90deg, ${HEAT_STOPS.map(([pos, [r, g, b]]) => `rgb(${r},${g},${b}) ${(pos * 100).toFixed(0)}%`).join(', ')})`;
const HEAT_COLS = 32;
const HEAT_CHIPS = [
  { color: heatColor(0.1), label: 'Idle / Low' },
  { color: heatColor(0.48), label: 'Moderate' },
  { color: heatColor(0.88), label: 'High' },
  { color: heatColor(1), label: 'Peak' },
];

function ActivityHeatmap({ cameraData = cameras }) {
  const rows = cameraData.map((camera) => ({
    id: camera.id,
    label: camera.name,
    trucks: Math.max(0, Number(camera.detectedTrucks) || 0),
    active: camera.connected !== false,
  }));
  const maxScale = Math.max(...rows.map((row) => row.trucks), 1);

  return <div className="activity-heatmap">
    <TitleWithDivider>
      <h3 className="text-keys frame-title">Activity Heatmap</h3>
    </TitleWithDivider>
    <div className="heatmap-content">
      <div className="heatmap-rows">
        {rows.map((row) => {
          const fill = Math.min(1, row.trucks / maxScale);
          return (
            <div className="heatmap-row" key={row.id}>
              <span className={`heatmap-row-label ${row.active ? '' : 'is-offline'}`}>{row.label}</span>
              <div className="heatmap-row-track">
                {Array.from({ length: HEAT_COLS }, (_, index) => {
                  const colFrac = (index + 1) / HEAT_COLS;
                  const on = row.trucks > 0 && colFrac <= fill;
                  const tint = on ? heatColor(colFrac) : undefined;
                  return <i
                    key={index}
                    className={on ? 'heatmap-row-cell is-on' : 'heatmap-row-cell'}
                    style={on ? {
                      background: tint,
                      boxShadow: colFrac > 0.85 ? `0 0 4px ${tint}` : undefined,
                      animationDelay: `${row.id * 0.35 + index * 0.07}s`,
                    } : undefined}
                  />;
                })}
              </div>
              <span className="heatmap-row-value data-value">{row.trucks}</span>
            </div>
          );
        })}
      </div>
      <div className="heatmap-scale">
        <i className="heatmap-scale-bar" style={{ background: HEAT_LEGEND }} />
        <div className="heatmap-chips">
          {HEAT_CHIPS.map((chip) => (
            <span className="heatmap-chip" key={chip.label}>
              <i style={{ background: chip.color }} />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>;
}

function TrafficSummary({ data, cameras: cameraData = cameras }) {
  return <section className="traffic-summary" aria-label="Traffic Summary">
    <header>
      <TitleWithDivider>
        <Icon name="trend" className="traffic-heading-icon" /><h2 className="text-keys frame-title">Traffic Summary</h2>
      </TitleWithDivider>
    </header>
    <div className="traffic-metric-grid">
      <TrafficMetric icon="truck" label="Truck / Day" value={data.day} change={data.dayChange} comparison="vs. yesterday" />
      <TrafficMetric icon="calendar" label="Truck / Month" value={data.month} change={data.monthChange} comparison="vs. last month" />
    </div>
    <UtilizationBar value={data.utilization} />
    <div className="traffic-divider" />
    <ActivityHeatmap cameraData={cameraData} />
  </section>;
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 15 .1.1 1.8 1.4-2 3.4-2.2-.8-.2.1-.8 2.2h-4l-.8-2.2-.2-.1-2.2.8-2-3.4 1.8-1.4.1-.2-.4-2.3 3.4-2 1.8 1.5h.2L14.4 2h4l.8 2.2h.2l1.8-1.5 3.4 2-.4 2.3.1.2 1.8 1.4-2 3.4-2.2-.8-.2.1-.4 2.3Z" transform="translate(-6 -1) scale(.75)"/></svg>;
}

function CameraSettings({ cameras: cameraState }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [devices, setDevices] = useState([]);

  const show = () => {
    const stored = JSON.parse(localStorage.getItem('camera-settings') || '{}');
    setForm(cameraState.map((camera) => ({ id: camera.id, name: camera.name, url: stored[camera.id]?.url || '' })));
    setMessage('');
    setOpen(true);
  };
  const update = (id, field, value) => setForm((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const scan = async () => {
    setDiscovering(true); setMessage('Scanning the local network for ONVIF devices…');
    try {
      const result = await discoverCameras();
      setDevices(result.devices);
      setMessage(result.warning || (result.devices.length ? `Found ${result.devices.length} compatible device${result.devices.length === 1 ? '' : 's'}.` : 'No ONVIF devices responded. Confirm the recorder is on the same network and ONVIF is enabled.'));
    } catch (error) { setMessage(error.message); }
    finally { setDiscovering(false); }
  };
  const assign = (device, cameraId) => update(cameraId, 'url', `rtsp://${device.host}:554/`);
  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage('');
    const payload = form.map((camera) => ({ ...camera, counting_line: [.1,.68,.9,.68], queue_zone: [.05,.2,.9,.48] }));
    try {
      await saveCameraConfig(payload);
      localStorage.setItem('camera-settings', JSON.stringify(Object.fromEntries(form.map((camera) => [camera.id, camera]))));
      setMessage('Camera settings saved. Streams are reconnecting.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  return <>
    <button className="camera-settings-button" type="button" onClick={show} aria-label="Configure cameras"><SettingsIcon /></button>
    {open && createPortal(<div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <form className="settings-dialog" onSubmit={save}>
        <header><div><SettingsIcon /><h2>Camera Settings</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close settings">×</button></header>
        <p>Configure each CCTV stream manually or discover ONVIF cameras, NVRs and DVRs on this local network.</p>
        <section className="device-discovery">
          <button type="button" onClick={scan} disabled={discovering}>{discovering ? 'Scanning…' : 'Scan nearby devices'}</button>
          {devices.map((device) => <div className="discovered-device" key={device.id}><span><strong>{device.name}</strong><small>{device.host} · {device.type}</small></span><select defaultValue="" onChange={(event) => { if (event.target.value) assign(device, Number(event.target.value)); }}><option value="">Assign to…</option>{form.map((camera) => <option key={camera.id} value={camera.id}>{camera.name}</option>)}</select></div>)}
        </section>
        <div className="settings-camera-list">{form.map((camera) => <fieldset key={camera.id}>
          <legend>Camera {camera.id}</legend>
          <label>Name<input value={camera.name} onChange={(event) => update(camera.id, 'name', event.target.value)} required /></label>
          <label>RTSP URL<input type="password" value={camera.url} onChange={(event) => update(camera.id, 'url', event.target.value)} placeholder="rtsp://user:password@camera-ip/..." autoComplete="off" /></label>
        </fieldset>)}</div>
        {message && <output>{message}</output>}
        <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save & Connect'}</button></footer>
      </form>
    </div>, document.body)}
  </>;
}

function MoodIcon({ mood }) {
  return mood === 'dark' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.1A9 9 0 0 1 8.9 3.3 9 9 0 1 0 20.7 15.1Z" /></svg>
  );
}

function useStageScale() {
  const [scale, setScale] = useState({ x: 1, y: 1 });

  useEffect(() => {
    const root = document.documentElement;
    const measure = () => setScale((current) => {
      const next = { x: root.clientWidth / DESIGN_WIDTH, y: root.clientHeight / DESIGN_HEIGHT };
      return current.x === next.x && current.y === next.y ? current : next;
    });

    /* Entering or leaving fullscreen can settle over a few frames, and a
     * resize that happens while the tab is hidden is never observed. */
    const remeasure = () => {
      measure();
      requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    document.addEventListener('fullscreenchange', remeasure);
    document.addEventListener('visibilitychange', remeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('orientationchange', remeasure);
      document.removeEventListener('fullscreenchange', remeasure);
      document.removeEventListener('visibilitychange', remeasure);
    };
  }, []);

  return scale;
}

export default function App() {
  const [mood, setMood] = useState(() => localStorage.getItem('dashboard-mood') || 'light');
  const scale = useStageScale();
  const { snapshot } = useDashboardStream();
  const liveCameras = snapshot?.cameras?.length
    ? snapshot.cameras.map((camera) => ({
        ...camera,
        source: camera.connected ? cameraStreamUrl(camera.id) : '/assets/camera-yard.png',
      }))
    : cameras;
  const liveTraffic = snapshot?.traffic
    ? { ...dashboardData.traffic, ...snapshot.traffic }
    : dashboardData.traffic;

  const toggleMood = () => setMood((current) => {
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dashboard-mood', next);
    return next;
  });

  return (
    <main className={`dashboard-screen mood-${mood}`}>
      <div
        className="dashboard-stage"
        style={{ '--stage-scale-x': scale.x, '--stage-scale-y': scale.y }}
      >
        <picture className="dashboard-frame">
          <img src={mood === 'dark' ? '/assets/dashboard-dark.png' : '/assets/camera-page2.png'} alt="" />
        </picture>
        <img
          className="dashboard-logo dashboard-logo--ems"
          src="/assets/EMSLogo2.png"
          alt="EMS"
        />
        <img
          className="dashboard-logo dashboard-logo--rsookh"
          src="/assets/Rsookh-logo.png"
          alt="Rsookh"
        />
        <button className="mood-toggle-button" type="button" onClick={toggleMood} aria-label={`Switch to ${mood === 'dark' ? 'light' : 'dark'} mood`} title={`Switch to ${mood === 'dark' ? 'light' : 'dark'} mood`}><MoodIcon mood={mood} /></button>
        <CCTVPanel cameraData={liveCameras} />
        <div className="weight-panels">
          {weightData.map((weight) => <WeightGauge key={weight.id} {...weight} />)}
        </div>
        <InvoiceSummary {...invoiceData} />
        <TruckActivityTrend datasets={activityData} />
        <KPIOverview data={kpiData} />
        <TrafficSummary data={liveTraffic} cameras={liveCameras} />
        <CameraSettings cameras={liveCameras} />
        <nav className="dashboard-pagination" aria-label="Dashboard pages"><i className="active" /><i /><i /><i /></nav>
      </div>
    </main>
  );
}
