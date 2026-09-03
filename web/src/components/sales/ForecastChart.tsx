import React from 'react';
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
import { Sparkles, ShieldCheck } from 'lucide-react';
import type { DemandForecast } from '../../types/sales';

interface ForecastChartProps {
  forecast: DemandForecast | null;
  onTriggerNewForecast: () => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  onTriggerNewForecast
}) => {
  if (!forecast || !forecast.items || forecast.items.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          padding: 16,
          borderRadius: '50%',
          background: 'var(--primary-glow)',
          color: '#818CF8',
          marginBottom: 16
        }}>
          <Sparkles size={32} />
        </div>
        <h3 style={{ fontSize: '1.25rem', color: '#FFF', marginBottom: 8 }}>
          No Active Demand Forecast Loaded
        </h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 24px' }}>
          Run your <strong>Demand Forecast Agent</strong> to analyze historical trading velocity, seasonal variances, and generate forward demand curves.
        </p>
        <button className="btn btn-primary" onClick={onTriggerNewForecast}>
          <Sparkles size={16} />
          Generate AI Demand Forecast
        </button>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = forecast.items.map((item) => {
    const dateObj = new Date(item.forecastDateUtc);
    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: dateLabel,
      predicted: item.predictedQuantity,
      lowerBound: item.lowerBoundQuantity,
      upperBound: item.upperBoundQuantity,
    };
  });

  return (
    <div className="glass-card" style={{ marginBottom: 32 }}>
      {/* Header & Meta */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.25rem', color: '#FFF', margin: 0 }}>
              AI Demand Projection: <span style={{ color: '#818CF8' }}>{forecast.productName}</span>
            </h2>
            <span className="badge badge-primary">
              {forecast.period}-Day Horizon
            </span>
            <span className="badge badge-emerald">
              {(forecast.confidenceScore * 100).toFixed(0)}% Confidence
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Product SKU: <code style={{ color: '#A5B4FC' }}>{forecast.productSku}</code> | Branch: <strong style={{ color: '#FFF' }}>{forecast.branchName}</strong>
          </p>
        </div>

        {/* Forecast Metrics Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(31, 41, 55, 0.5)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Projected Total Demand</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF' }}>
              {forecast.predictedTotalDemand} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>units</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(31, 41, 55, 0.5)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daily Demand Velocity</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34D399' }}>
              {forecast.averageDailyDemand.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/ day</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(31, 41, 55, 0.5)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recommended Safety Stock</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FBBF24' }}>
              {forecast.recommendedSafetyStock} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>units</span>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={onTriggerNewForecast} style={{ fontSize: '0.8rem' }}>
            <Sparkles size={14} color="#818CF8" />
            Re-run Agent
          </button>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div style={{ width: '100%', height: 320, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="boundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FFF',
                boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
              }}
              labelStyle={{ color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="#A855F7"
              strokeDasharray="4 4"
              fill="url(#boundGradient)"
              name="Upper Bound (95% CI)"
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#6366F1"
              strokeWidth={3}
              fill="url(#predGradient)"
              name="AI Predicted Demand"
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="#06B6D4"
              strokeDasharray="4 4"
              fill="transparent"
              name="Lower Bound (95% CI)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Agent Reasoning Section */}
      {forecast.agentReasoning && (
        <div style={{
          marginTop: 20,
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.07)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <div style={{ color: '#818CF8', marginTop: 2 }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Auditable AI Reasoning Summary
            </div>
            <p style={{ fontSize: '0.85rem', color: '#E0E7FF', marginTop: 2 }}>
              {forecast.agentReasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
