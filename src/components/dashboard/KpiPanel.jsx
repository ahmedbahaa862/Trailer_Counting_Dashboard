import PanelTitle from './PanelTitle';

export default function KpiPanel({ values }) {
  const angles = values.map((value, i) => { const a = (-90 + i * 72) * Math.PI / 180; const r = value; return `${100 + Math.cos(a)*r},${100 + Math.sin(a)*r}`; }).join(' ');
  return <section className="kpi-panel"><PanelTitle icon="kpi">KPI Overview</PanelTitle><div className="radar"><svg viewBox="0 0 200 200"><g>{[24,42,60,78].map((r) => <polygon key={r} points={[0,1,2,3,4].map((i) => { const a=(-90+i*72)*Math.PI/180; return `${100+Math.cos(a)*r},${100+Math.sin(a)*r}`; }).join(' ')} />)}{[0,1,2,3,4].map((i) => {const a=(-90+i*72)*Math.PI/180; return <line key={i} x1="100" y1="100" x2={100+Math.cos(a)*78} y2={100+Math.sin(a)*78}/>})}<polygon className="radar-value" points={angles}/></g></svg><span className="data-value top">Throughput</span><span className="data-value right">Accuracy</span><span className="data-value bottom">Billing</span><span className="data-value left">Utilization</span></div></section>;
}
