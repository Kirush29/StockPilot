import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Sparkles, ShieldCheck, Bot, DollarSign, Layers, Calendar, BarChart2, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { DemandForecast } from '../../types/sales';

interface ForecastChartProps {
  forecast: DemandForecast | null;
  onTriggerNewForecast: () => void;
  onInspectAgentTrace?: () => void;
  selectedHorizon?: number;
  onHorizonChange?: (horizon: number) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  onTriggerNewForecast,
  onInspectAgentTrace,
  selectedHorizon = 30,
  onHorizonChange
}) => {
  const [metricMode, setMetricMode] = useState<'volume' | 'revenue'>('volume');

  if (!forecast || !forecast.items || forecast.items.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          display: 'inline-flex',
          padding: 14,
          borderRadius: '50%',
          background: 'rgba(0, 104, 255, 0.1)',
          color: 'var(--primary-color)',
          marginBottom: 14
        }}>
          <Sparkles size={28} />
        </div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 8, fontWeight: 700 }}>
          No Active Demand Projection
        </h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 440, fontSize: '0.85rem', marginBottom: 20 }}>
          Launch the <strong>Demand Forecast Agent</strong> to analyze 60-day historical velocities and synthesize forward curves.
        </p>
        <button className="btn btn-primary" onClick={onTriggerNewForecast}>
          <Sparkles size={15} />
          Execute Demand Agent
        </button>
      </div>
    );
  }

  // Estimated price per unit for revenue projection mode ($24.50 avg SKU price)
  const estUnitPrice = 24.50;

  // Format data for Recharts with confidence interval band calculations
  const chartData = forecast.items.map((item) => {
    const dateObj = new Date(item.forecastDateUtc);
    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const factor = metricMode === 'revenue' ? estUnitPrice : 1;
    const predicted = Math.round(item.predictedQuantity * factor);
    const lower = Math.round(item.lowerBoundQuantity * factor);
    const upper = Math.round(item.upperBoundQuantity * factor);

    return {
      date: dateLabel,
      predicted,
      lowerBound: lower,
      upperBound: upper,
      spread: Math.round((upper - lower) / 2)
    };
  });

  const horizons = [
    { label: '7D (Weekly)', days: 7 },
    { label: '14D (Bi-Weekly)', days: 14 },
    { label: '30D (Monthly)', days: 30 },
    { label: '90D (Quarterly)', days: 90 }
  ];

  const currentHorizonDays = selectedHorizon || forecast.period || 30;

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 14,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Sales & Demand Forecast Curve
            </h3>
            <span className="badge badge-primary">
              {currentHorizonDays}-Day Horizon
            </span>
            <span className="badge badge-emerald">
              {(forecast.confidenceScore * 100).toFixed(0)}% Confidence
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Product: <strong style={{ color: 'var(--text-primary)' }}>{forecast.productName}</strong> (<code style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{forecast.productSku}</code>)
          </div>
        </div>

        {/* Right side controls: Horizon Tabs, Metric Mode Toggle & Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Horizon Selector Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            {horizons.map((h) => {
              const isSelected = currentHorizonDays === h.days;
              return (
                <button
                  key={h.days}
                  onClick={() => onHorizonChange && onHorizonChange(h.days)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--primary-color)' : 'transparent',
                    color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Change forecast horizon to ${h.label}`}
                >
                  {h.label.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Revenue vs Volume Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setMetricMode('volume')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: metricMode === 'volume' ? 'var(--primary-color)' : 'transparent',
                color: metricMode === 'volume' ? '#FFFFFF' : 'var(--text-muted)'
              }}
            >
              <Layers size={13} />
              <span>Volume</span>
            </button>
            <button
              onClick={() => setMetricMode('revenue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: metricMode === 'revenue' ? 'var(--primary-color)' : 'transparent',
                color: metricMode === 'revenue' ? '#FFFFFF' : 'var(--text-muted)'
              }}
            >
              <DollarSign size={13} />
              <span>Revenue</span>
            </button>
          </div>

          {onInspectAgentTrace && (
            <button
              className="btn btn-secondary"
              onClick={onInspectAgentTrace}
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              <Bot size={13} color="#6366F1" />
              <span>Trace</span>
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={onTriggerNewForecast}
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            <Sparkles size={13} color="var(--primary-color)" />
            <span>Re-run</span>
          </button>
        </div>
      </div>

      {/* 4 Core Agent Capabilities Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 10,
        marginBottom: 16
      }}>
        {/* 1. Analyses Sales History */}
        <div style={{
          padding: '10px 12px',
          background: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <BarChart2 size={13} color="var(--primary-color)" />
            <span style={{ fontWeight: 600 }}>Sales History Analysis</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {forecast.averageDailyDemand.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>units/day</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
            60-Day Observed Velocity
          </div>
        </div>

        {/* 2. Estimates Future Demand */}
        <div style={{
          padding: '10px 12px',
          background: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <TrendingUp size={13} color="#10B981" />
            <span style={{ fontWeight: 600 }}>Future Demand Estimate</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }}>
            {metricMode === 'revenue' 
              ? `$${Math.round(forecast.predictedTotalDemand * estUnitPrice).toLocaleString()}`
              : `${forecast.predictedTotalDemand.toLocaleString()} units`}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {currentHorizonDays}-Day Horizon • {forecast.trend === 1 ? 'Increasing (+)' : forecast.trend === 2 ? 'Decreasing (-)' : 'Stable Trend'}
          </div>
        </div>

        {/* 3. Suggests Reorder Dates */}
        <div style={{
          padding: '10px 12px',
          background: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <Calendar size={13} color="#D97706" />
            <span style={{ fontWeight: 600 }}>Suggested Reorder Date</span>
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#D97706' }}>
            {forecast.suggestedReorderDateUtc 
              ? new Date(forecast.suggestedReorderDateUtc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'In 4 Days'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Safety Stock: {forecast.recommendedSafetyStock}u • ROP: {Math.round((forecast.averageDailyDemand * 7) + forecast.recommendedSafetyStock)}u
          </div>
        </div>

        {/* 4. Returns Structured Forecasts */}
        <div style={{
          padding: '10px 12px',
          background: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <CheckCircle2 size={13} color="#6366F1" />
            <span style={{ fontWeight: 600 }}>Confidence Band</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4F46E5' }}>
            {(forecast.confidenceScore * 100).toFixed(0)}% <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Confidence</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Shaded 95% Confidence Interval
          </div>
        </div>
      </div>

      {/* Recharts Area Graph with Shaded Confidence Band */}
      <div style={{ width: '100%', height: 280, flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0068FF" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0068FF" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="confidenceBandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0068FF" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#0068FF" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              tickFormatter={(v) => (metricMode === 'revenue' ? `$${v}` : `${v}`)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      color: 'var(--text-primary)'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0068FF' }} />
                        <span style={{ color: 'var(--text-muted)' }}>Predicted:</span>
                        <strong>{metricMode === 'revenue' ? `$${data.predicted.toLocaleString()}` : `${data.predicted} units`}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#818CF8' }} />
                        <span style={{ color: 'var(--text-muted)' }}>Upper Bound (95%):</span>
                        <span>{metricMode === 'revenue' ? `$${data.upperBound.toLocaleString()}` : `${data.upperBound} units`}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38BDF8' }} />
                        <span style={{ color: 'var(--text-muted)' }}>Lower Bound (95%):</span>
                        <span>{metricMode === 'revenue' ? `$${data.lowerBound.toLocaleString()}` : `${data.lowerBound} units`}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#0068FF', backgroundColor: '#EFF6FF', padding: '3px 6px', borderRadius: 4 }}>
                        Confidence Spread: &plusmn;{metricMode === 'revenue' ? `$${data.spread}` : `${data.spread} units`}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: '0.78rem' }} />
            {/* Shaded Confidence Interval Band */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="#818CF8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#confidenceBandGradient)"
              name="Upper Bound (95% CI)"
            />
            {/* Main Prediction Line */}
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#0068FF"
              strokeWidth={2.8}
              fill="url(#predGradient)"
              name={metricMode === 'revenue' ? 'Predicted Revenue ($)' : 'Predicted Demand (Units)'}
            />
            {/* Lower Bound */}
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="#38BDF8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              name="Lower Bound (95% CI)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Auditable Reasoning Banner */}
      {forecast.agentReasoning && (
        <div style={{
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={16} color="#0068FF" />
            <div style={{ fontSize: '0.78rem', color: '#1E3A8A' }}>
              <strong>AI Reasoning:</strong> {forecast.agentReasoning}
            </div>
          </div>
          {onInspectAgentTrace && (
            <button
              onClick={onInspectAgentTrace}
              style={{
                background: 'none',
                border: 'none',
                color: '#0068FF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textDecoration: 'underline'
              }}
            >
              View Trace &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
};
