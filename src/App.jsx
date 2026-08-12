import { useEffect, useState } from 'react';
import Icon from './components/dashboard/Icon';
import { dashboardData } from './data/dashboardMockData';
import useDashboardStream, { cameraStreamUrl, discoverCameras, saveCameraConfig } from './hooks/useDashboardStream';

const cameras = [
  { id: 1, name: 'Camera 1', connected: true, source: '/assets/gate-camera.svg', detectedTrucks: 18, queueCount: 3 },
  { id: 2, name: 'Camera 2', connected: true, source: '/assets/gate-camera.svg', detectedTrucks: 12, queueCount: 2 },
  { id: 3, name: 'Camera 3', connected: false, source: '/assets/gate-camera.svg', detectedTrucks: 0, queueCount: 0 },
];

const weightData = [
  { id: 'today', title: 'Today Weight', value: 284, unit: 'Tons', percentage: 72, targetLabel: 'of daily target' },
  { id: 'month', title: 'Month Weight', value: 7234, unit: 'Tons', percentage: 80, targetLabel: 'of monthly target' },
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
    { label: 'Mon', value: 54 }, { label: 'Tue', value: 83 }, { label: 'Wed', value: 126 },
    { label: 'Thu', value: 91 }, { label: 'Fri', value: 142 }, { label: 'Sat', value: 105 }, { label: 'Sun', value: 68 },
  ],
  '30D': [
    { label: 'Jan', value: 62 }, { label: 'Feb', value: 112 }, { label: 'Mar', value: 176 },
    { label: 'Apr', value: 96 }, { label: 'May', value: 118 }, { label: 'Jun', value: 73 }, { label: 'Jul', value: 51 },
  ],
  '90D': [
    { label: 'May', value: 79 }, { label: 'Jun', value: 105 }, { label: 'Jul', value: 88 },
    { label: 'Aug', value: 151 }, { label: 'Sep', value: 124 }, { label: 'Oct', value: 94 }, { label: 'Nov', value: 66 },
  ],
};

const kpiData = [
  { subject: 'Throughput', value: 78 },
  { subject: 'Accuracy', value: 58 },
  { subject: 'Billing', value: 72 },
  { subject: 'Utilization', value: 64 },
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

function CCTVPanel({ cameraData = cameras }) {
  const [selectedCameraId, setSelectedCameraId] = useState(1);
  const selectedCamera = cameraData.find(({ id }) => id === selectedCameraId) || cameraData[0];

  return (
    <section className="cctv-panel" aria-label="CCTV cameras">
      <header className="camera-heading">
        <div className="camera-title"><CameraIcon /><h1 className="text-keys frame-title">Live Camera View</h1></div>
        <CameraStatus connected={selectedCamera.connected} />
      </header>

      <div className="camera-layout">
        <div className={`camera-viewport ${selectedCamera.connected ? '' : 'is-offline'}`}>
          <img src={selectedCamera.source} alt={`${selectedCamera.name} CCTV view`} />
          <div className="camera-nameplate">{selectedCamera.name}</div>
          {!selectedCamera.connected && <div className="offline-message">Camera offline</div>}
          <CameraMetrics camera={selectedCamera} />
        </div>

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
      </div>
    </section>
  );
}

function WeightGauge({ title, value, unit, percentage, targetLabel }) {
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

  return <section className="weight-gauge" aria-label={`${title}: ${value} ${unit}`}>
    <header><img src="/assets/weight1.png" alt="" aria-hidden="true" /><h2 className="text-keys frame-title">{title}</h2></header>
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
            return <line key={index} className={index < activeSegments ? 'active' : ''} x1={x1} y1={y1} x2={x2} y2={y2} />;
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
      <div><img src="/assets/invoice.png" alt="" aria-hidden="true" /><h2 className="text-keys frame-title">{title}</h2></div>
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

function TruckActivityTrend({ datasets, initialRange = '30D' }) {
  const [range, setRange] = useState(initialRange);
  const data = datasets[range] || [];
  const plot = { left: 67, right: 690, top: 36, bottom: 350 };
  const maxValue = 200;
  const points = data.map((item, index) => ({
    ...item,
    x: plot.left + (index * (plot.right - plot.left)) / Math.max(data.length - 1, 1),
    y: plot.bottom - (Math.min(item.value, maxValue) / maxValue) * (plot.bottom - plot.top),
  }));
  const linePath = smoothPath(points);
  const areaPath = points.length ? `${linePath} L ${points.at(-1).x} ${plot.bottom} L ${points[0].x} ${plot.bottom} Z` : '';

  return <section className="activity-trend" aria-label="Truck Activity Trend">
    <header>
      <div className="trend-title"><Icon name="trend" className="trend-heading-icon" /><h2 className="text-keys frame-title">Truck Activity Trend</h2></div>
      <div className="range-selector" aria-label="Activity period">
        {Object.keys(datasets).map((option) => <button type="button" key={option} className={`text-keys ${range === option ? 'active' : ''}`} onClick={() => setRange(option)} aria-pressed={range === option}>{option}</button>)}
      </div>
    </header>
    <svg className="activity-chart" viewBox="0 0 720 420" role="img" aria-label={`${range} truck activity chart`}>
      <defs>
        <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#20eaff" stopOpacity=".84"/><stop offset=".58" stopColor="#0789ef" stopOpacity=".55"/><stop offset="1" stopColor="#0061bd" stopOpacity=".22"/></linearGradient>
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0, 50, 100, 150, 200].map((value) => {
        const y = plot.bottom - (value / maxValue) * (plot.bottom - plot.top);
        return <g key={value}><line className="trend-gridline" x1={plot.left} y1={y} x2={plot.right} y2={y}/><text className="data-value trend-y-label" x="45" y={y + 6} textAnchor="end">{value}</text></g>;
      })}
      <line className="trend-axis" x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom}/>
      <line className="trend-axis" x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom}/>
      <path d={areaPath} fill="url(#activity-area)"/>
      <path className="activity-line" d={linePath}/>
      {points.map((point) => <g key={point.label}><circle className="activity-point-glow" cx={point.x} cy={point.y} r="8"/><circle className="activity-point" cx={point.x} cy={point.y} r="4.5"/><text className="data-value trend-x-label" x={point.x} y="390" textAnchor="middle">{point.label}</text></g>)}
    </svg>
  </section>;
}

function KPIOverview({ data, maxValue = 100 }) {
  const center = 250;
  const radius = 150;
  const normalized = Object.fromEntries(data.map(({ subject, value }) => [subject, Math.max(0, Math.min(maxValue, Number(value) || 0))]));
  const cardinal = [normalized.Throughput || 0, normalized.Accuracy || 0, normalized.Billing || 0, normalized.Utilization || 0];
  const values = cardinal.flatMap((value, index) => [value, (value + cardinal[(index + 1) % cardinal.length]) / 2]);
  const pointAt = (index, distance) => {
    const angle = (-90 + index * 45) * Math.PI / 180;
    return { x: center + Math.cos(angle) * distance, y: center + Math.sin(angle) * distance };
  };
  const polygon = values.map((value, index) => {
    const point = pointAt(index, radius * value / maxValue);
    return `${point.x},${point.y}`;
  }).join(' ');

  return <section className="kpi-overview" aria-label="KPI Overview">
    <header><Icon name="kpi" className="kpi-heading-icon" /><h2 className="text-keys frame-title">KPI Overview</h2></header>
    <svg className="kpi-radar" viewBox="0 0 500 500" role="img" aria-label="Key performance indicator radar chart">
      <defs>
        <filter id="radar-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1bf4f2" stopOpacity=".63"/><stop offset="1" stopColor="#00aebf" stopOpacity=".35"/></linearGradient>
      </defs>
      <g className="radar-grid">
        {[.2,.4,.6,.8,1].map((scale) => <polygon key={scale} points={Array.from({length:8},(_,index) => { const p=pointAt(index,radius*scale); return `${p.x},${p.y}`; }).join(' ')} />)}
        {Array.from({length:8},(_,index) => { const p=pointAt(index,radius); return <line key={index} x1={center} y1={center} x2={p.x} y2={p.y}/>; })}
      </g>
      <polygon className="radar-data" points={polygon}/>
      {values.map((value,index) => { const p=pointAt(index,radius*value/maxValue); return <circle className="radar-point" key={index} cx={p.x} cy={p.y} r="5"/>; })}
      <circle className="radar-center" cx={center} cy={center} r="15"/>
      <text className="text-keys radar-label throughput" x="250" y="59" textAnchor="middle">Throughput</text>
      <text className="text-keys radar-label accuracy" x="437" y="257" textAnchor="start">Accuracy</text>
      <text className="text-keys radar-label billing" x="250" y="455" textAnchor="middle">Billing</text>
      <text className="text-keys radar-label utilization" x="63" y="257" textAnchor="end">Utilization</text>
    </svg>
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

function ActivityHeatmap({ data }) {
  const columns = Math.max(...data.map((row) => row.length), 1);
  return <div className="activity-heatmap">
    <h3 className="text-keys">Activity Heatmap</h3>
    <div className="heatmap-content">
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {data.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
          const intensity = Math.max(0, Math.min(1, Number(value) || 0));
          const hue = 218 - intensity * 170;
          const lightness = 11 + intensity * 52;
          return <i className="heatmap-cell" key={`${rowIndex}-${columnIndex}`} title={`Activity: ${Math.round(intensity * 100)}%`} style={{ backgroundColor: `hsl(${hue} 100% ${lightness}%)`, boxShadow: `inset 0 0 8px hsla(${hue} 100% 60% / ${.15 + intensity * .55})` }} />;
        }))}
      </div>
      <div className="heatmap-legend"><span className="text-keys">High</span><i /><span className="text-keys">Low</span></div>
    </div>
  </div>;
}

function TrafficSummary({ data }) {
  return <section className="traffic-summary" aria-label="Traffic Summary">
    <header><Icon name="trend" className="traffic-heading-icon" /><h2 className="text-keys frame-title">Traffic Summary</h2></header>
    <div className="traffic-metric-grid">
      <TrafficMetric icon="truck" label="Truck / Day" value={data.day} change={data.dayChange} comparison="vs. yesterday" />
      <TrafficMetric icon="calendar" label="Truck / Month" value={data.month} change={data.monthChange} comparison="vs. last month" />
    </div>
    <UtilizationBar value={data.utilization} />
    <div className="traffic-divider" />
    <ActivityHeatmap data={data.heatmap} />
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
    {open && <div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
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
    </div>}
  </>;
}

function MoodIcon({ mood }) {
  return mood === 'dark' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.1A9 9 0 0 1 8.9 3.3 9 9 0 1 0 20.7 15.1Z" /></svg>
  );
}

export default function App() {
  const [mood, setMood] = useState(() => localStorage.getItem('dashboard-mood') || 'light');
  const { snapshot } = useDashboardStream();
  const liveCameras = snapshot?.cameras?.length
    ? snapshot.cameras.map((camera) => ({
        ...camera,
        source: camera.connected ? cameraStreamUrl(camera.id) : '/assets/gate-camera.svg',
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
      <TrafficSummary data={liveTraffic} />
      <CameraSettings cameras={liveCameras} />
      <nav className="dashboard-pagination" aria-label="Dashboard pages"><i className="active" /><i /><i /><i /></nav>
    </main>
  );
}
