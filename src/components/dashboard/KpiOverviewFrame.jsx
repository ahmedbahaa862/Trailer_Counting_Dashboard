import KpiSpiderChart from './KpiSpiderChart';

function TrendIcon({ trend }) {
  return (
    <svg className="kpi-relation-trend" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d={trend === 'up' ? 'M6 2 L10 9 H2 Z' : 'M6 10 L10 3 H2 Z'}
        fill={trend === 'up' ? '#34d399' : '#f87171'}
      />
    </svg>
  );
}

export default function KpiOverviewFrame({ metrics, relations = [] }) {
  return (
    <div className="kpi-overview-frame">
      <div className="kpi-spider-wrap">
        <KpiSpiderChart metrics={metrics} className="kpi-spider-chart" />
      </div>

      <div className="kpi-relations-divider" />

      <div className="kpi-relations">
        {relations.map((relation) => (
          <div className="kpi-relation" key={relation.pair}>
            <span className="kpi-relation-bullet">•</span>
            <div className="kpi-relation-body">
              <span className="kpi-relation-pair">{relation.pair}</span>
              <span className="kpi-relation-detail">
                {relation.detail}
                <TrendIcon trend={relation.trend} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
