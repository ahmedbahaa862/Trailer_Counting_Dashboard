import PanelTitle from './PanelTitle';

const makePoints = (values) => values.map((value, index) => `${index * (360 / (values.length - 1))},${190 - value * .82}`).join(' ');

export default function TrendChart({ values, labels }) {
  const points = makePoints(values);
  return <section className="trend-panel"><PanelTitle icon="trend" actions={<div className="ranges data-value"><button>7D</button><button className="active">30D</button><button>90D</button></div>}>Truck Activity Trend</PanelTitle>
    <svg className="trend-chart" viewBox="0 0 410 220" role="img" aria-label="Truck activity trend chart"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#04efff" stopOpacity=".68"/><stop offset="1" stopColor="#0879ff" stopOpacity=".08"/></linearGradient></defs>{[30,76,122,168].map((y) => <line key={y} x1="0" y1={y} x2="360" y2={y} className="grid-line" />)}<polygon points={`0,200 ${points} 360,200`} fill="url(#area)"/><polyline points={points} fill="none" className="trend-line"/>{values.map((v, i) => <circle key={i} cx={i * 45} cy={190-v*.82} r="3" />)}</svg><div className="chart-labels data-value">{labels.map((label) => <span key={label}>{label}</span>)}</div>
  </section>;
}
