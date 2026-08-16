import { useEffect, useId, useMemo, useRef, useState } from 'react';

const DEFAULT_VALUE_GAP = 20;

/* Per-axis label/value nudges, indexed by axis (top, right, bottom, left).
 * The side axes are pulled inward so long labels stay inside the viewBox. */
const DEFAULT_LABEL_VALUE_OFFSETS = [
  { labelDx: 0, labelDy: 0, valueDx: 0, valueDy: 0 },
  { labelDx: -8, labelDy: 0, valueDx: -8, valueDy: 0 },
  { labelDx: 0, labelDy: 0, valueDx: 0, valueDy: 0 },
  { labelDx: 8, labelDy: 0, valueDx: 8, valueDy: 0 },
];

const DEFAULT_INNER_CONTOUR_SCALES = [0.86, 0.74, 0.62, 0.5, 0.38, 0.26, 0.14];
const DEFAULT_DATA_RADIUS_MAX_RATIO = 0.68;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function defaultFormatValue(metric) {
  return `${metric.value}${metric.unit}`;
}

export default function KpiSpiderChart({
  metrics,
  size = 340,
  maxR = 74,
  dataRadiusMaxRatio = DEFAULT_DATA_RADIUS_MAX_RATIO,
  levels = 5,
  valueGap = DEFAULT_VALUE_GAP,
  innerContourScales = DEFAULT_INNER_CONTOUR_SCALES,
  labelValueOffsets,
  formatValue = defaultFormatValue,
  labelRingGap = 22,
  centerYOffset = 0,
  viewBox: viewBoxProp,
  className,
  style,
  liveMotion = false,
  liveAmplitude = 0.045,
  livePeriodMs = 3200,
}) {
  const uid = useId().replace(/:/g, '');
  const areaGradId = `radarAreaGradient-${uid}`;
  const glowRimId = `radarGlowRim-${uid}`;
  const glowWideId = `radarGlowWide-${uid}`;
  const glowBloomId = `radarGlowBloom-${uid}`;

  const offsets = labelValueOffsets
    ?? metrics.map((_, index) => DEFAULT_LABEL_VALUE_OFFSETS[index] ?? { labelDx: 0, labelDy: 0, valueDx: 0, valueDy: 0 });

  const cx = size / 2;
  const cy = size / 2 + centerYOffset;
  const stepAngle = (Math.PI * 2) / metrics.length;
  const startAngle = -Math.PI / 2;
  const viewBox = viewBoxProp ?? `0 0 ${size} ${size}`;

  const targetRadii = useMemo(
    () => metrics.map((metric) => maxR * dataRadiusMaxRatio * clamp01(metric.value / (metric.baseline || 1))),
    [metrics, maxR, dataRadiusMaxRatio],
  );

  const settledRef = useRef(targetRadii.map(() => 0));
  const targetRadiiRef = useRef(targetRadii);
  const [radii, setRadii] = useState(() => targetRadii.map(() => 0));
  const [enterScale, setEnterScale] = useState(liveMotion ? 0.55 : 1);
  const [glowPulse, setGlowPulse] = useState(1);
  const startRef = useRef(null);
  const enteredRef = useRef(false);

  targetRadiiRef.current = targetRadii;

  useEffect(() => {
    if (liveMotion) return;
    settledRef.current = [...targetRadii];
    setRadii(targetRadii);
    setEnterScale(1);
    setGlowPulse(1);
  }, [liveMotion, targetRadii]);

  useEffect(() => {
    if (!liveMotion) return undefined;

    let raf = 0;
    if (startRef.current == null) startRef.current = performance.now();

    const tick = (now) => {
      const started = startRef.current ?? now;
      const elapsed = now - started;

      if (!enteredRef.current) {
        const enterT = Math.min(elapsed / 900, 1);
        const eased = 1 - (1 - enterT) ** 3;
        setEnterScale(0.55 + 0.45 * eased);
        if (enterT >= 1) enteredRef.current = true;
      } else {
        setEnterScale(1);
      }

      const nextSettled = targetRadiiRef.current.map((target, index) => {
        const previous = settledRef.current[index] ?? 0;
        return previous + (target - previous) * 0.1;
      });
      settledRef.current = nextSettled;

      const cycle = (elapsed / livePeriodMs) * Math.PI * 2;
      setRadii(nextSettled.map((base, index) => Math.max(0, base * (1 + liveAmplitude * Math.sin(cycle + index * 1.15)))));
      setGlowPulse(0.88 + 0.12 * (0.5 + 0.5 * Math.sin(cycle * 0.7)));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [liveMotion, liveAmplitude, livePeriodMs]);

  const axisPoints = useMemo(
    () => metrics.map((_, index) => {
      const angle = startAngle + index * stepAngle;
      return {
        x: cx + Math.cos(angle) * maxR,
        y: cy + Math.sin(angle) * maxR,
        lx: cx + Math.cos(angle) * (maxR + labelRingGap),
        ly: cy + Math.sin(angle) * (maxR + labelRingGap),
      };
    }),
    [metrics.length, cx, cy, maxR, labelRingGap, stepAngle, startAngle],
  );

  const dataPoints = useMemo(
    () => metrics.map((_, index) => {
      const angle = startAngle + index * stepAngle;
      const r = radii[index] ?? 0;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }),
    [metrics.length, radii, cx, cy, stepAngle, startAngle],
  );

  const polygonPoints = useMemo(() => dataPoints.map((point) => `${point.x},${point.y}`).join(' '), [dataPoints]);

  const contourPolygonPointsList = useMemo(() => {
    if (innerContourScales.length === 0 || dataPoints.length === 0) return [];
    return innerContourScales.map((scale) => dataPoints
      .map((point) => `${cx + (point.x - cx) * scale},${cy + (point.y - cy) * scale}`)
      .join(' '));
  }, [dataPoints, cx, cy, innerContourScales]);

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label="Key performance indicator radar chart"
      style={{ transformOrigin: `${cx}px ${cy}px`, transform: `scale(${enterScale})`, ...style }}
    >
      <defs>
        <linearGradient id={areaGradId} x1="15%" y1="5%" x2="85%" y2="95%">
          <stop offset="0%" stopColor="#b8ffff" stopOpacity="0.58" />
          <stop offset="32%" stopColor="#67e8f9" stopOpacity="0.45" />
          <stop offset="58%" stopColor="#38bdf8" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.42" />
        </linearGradient>
        <filter id={glowBloomId} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={glowWideId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={glowRimId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.85" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {Array.from({ length: levels }, (_, index) => {
        const ratio = (index + 1) / levels;
        const ring = metrics.map((__, axis) => {
          const angle = startAngle + axis * stepAngle;
          return `${cx + Math.cos(angle) * maxR * ratio},${cy + Math.sin(angle) * maxR * ratio}`;
        }).join(' ');
        return <polygon key={`ring-${index}`} className="kpi-spider-ring" points={ring} />;
      })}

      {axisPoints.map((point, index) => (
        <line key={`axis-${index}`} className="kpi-spider-axis" x1={cx} y1={cy} x2={point.x} y2={point.y} />
      ))}

      {axisPoints.map((point, index) => (
        <circle key={`grid-dot-${index}`} className="kpi-spider-grid-dot" cx={point.x} cy={point.y} r="2.2" />
      ))}

      <g opacity={glowPulse}>
        <polygon
          points={polygonPoints}
          fill="none"
          stroke="#155e75"
          strokeWidth="14"
          strokeOpacity="0.32"
          strokeLinejoin="round"
          filter={`url(#${glowBloomId})`}
        />
        <polygon
          points={polygonPoints}
          fill="none"
          stroke="#0e7490"
          strokeWidth="7"
          strokeOpacity="0.45"
          strokeLinejoin="round"
          filter={`url(#${glowWideId})`}
        />

        <polygon points={polygonPoints} fill={`url(#${areaGradId})`} stroke="none" />

        {contourPolygonPointsList.map((points, index) => (
          <polygon key={`contour-${index}`} className="kpi-spider-contour" points={points} />
        ))}

        <polygon points={polygonPoints} fill="none" stroke="#0891b2" strokeWidth="1.25" strokeLinejoin="round" opacity={0.95} />
        <polygon
          points={polygonPoints}
          fill="none"
          stroke="#0e7490"
          strokeWidth="2.35"
          strokeLinejoin="round"
          filter={`url(#${glowRimId})`}
        />

        {dataPoints.map((point, index) => (
          <g key={`point-${index}`}>
            <circle cx={point.x} cy={point.y} r="6.2" fill="#0e7490" opacity="0.42" />
            <circle cx={point.x} cy={point.y} r="3.2" fill="#cffafe" stroke="rgba(8,145,178,0.85)" strokeWidth="0.9" />
          </g>
        ))}
      </g>

      {axisPoints.map((point, index) => {
        const anchor = point.lx > cx + 4 ? 'start' : (point.lx < cx - 4 ? 'end' : 'middle');
        const offset = offsets[index] ?? { labelDx: 0, labelDy: 0, valueDx: 0, valueDy: 0 };
        return (
          <g key={`label-${index}`}>
            <text
              className="kpi-spider-label"
              x={point.lx + offset.labelDx}
              y={point.ly + offset.labelDy}
              textAnchor={anchor}
            >
              {metrics[index].label}
            </text>
            <text
              className="kpi-spider-value"
              x={point.lx + offset.valueDx}
              y={point.ly + valueGap + offset.valueDy}
              textAnchor={anchor}
            >
              {formatValue(metrics[index])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
