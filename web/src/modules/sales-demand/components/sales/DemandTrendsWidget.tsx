import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { Flame, CalendarDays, TrendingUp, AlertCircle, Info } from 'lucide-react';
import type { DailySalesTrend, DayOfWeekPattern } from '../../types/sales';

interface DemandTrendsWidgetProps {
  dailyTrends: DailySalesTrend[];
  dayOfWeekPatterns: DayOfWeekPattern[];
}

export const DemandTrendsWidget: React.FC<DemandTrendsWidgetProps> = ({
  dailyTrends = [],
  dayOfWeekPatterns = []
}) => {
  const [activeView, setActiveView] = useState<'seasonality' | 'spikes'>('seasonality');

  // Fallback demo seasonality if not loaded yet
  const defaultSeasonality: DayOfWeekPattern[] = [
    { dayName: 'Monday', dayIndex: 1, averageQuantity: 28.4, averageRevenue: 695.8, totalDaysObserved: 4 },
    { dayName: 'Tuesday', dayIndex: 2, averageQuantity: 24.1, averageRevenue: 590.5, totalDaysObserved: 4 },
    { dayName: 'Wednesday', dayIndex: 3, averageQuantity: 36.8, averageRevenue: 901.6, totalDaysObserved: 4 },
    { dayName: 'Thursday', dayIndex: 4, averageQuantity: 26.2, averageRevenue: 641.9, totalDaysObserved: 4 },
    { dayName: 'Friday', dayIndex: 5, averageQuantity: 39.5, averageRevenue: 967.7, totalDaysObserved: 4 },
    { dayName: 'Saturday', dayIndex: 6, averageQuantity: 19.3, averageRevenue: 472.8, totalDaysObserved: 4 },
    { dayName: 'Sunday', dayIndex: 0, averageQuantity: 12.0, averageRevenue: 294.0, totalDaysObserved: 4 },
  ];

  const seasonalityData = dayOfWeekPatterns.length > 0 ? dayOfWeekPatterns : defaultSeasonality;

  // Find peak day of week
  const peakDay = seasonalityData.reduce((prev, curr) => 
    (curr.averageQuantity > prev.averageQuantity) ? curr : prev
  , seasonalityData[0]);

  // Identify spikes from daily trends
  const spikes = dailyTrends.filter((d) => d.isSpike);

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: 'rgba(0, 104, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-color)'
          }}>
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Demand Trends & Spikes
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Statistical Spikes (&mu; + 1.3&sigma;) & Day-of-Week Seasonality
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          padding: 3,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveView('seasonality')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeView === 'seasonality' ? 'var(--primary-color)' : 'transparent',
              color: activeView === 'seasonality' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarDays size={13} />
            <span>Seasonality</span>
          </button>
          <button
            onClick={() => setActiveView('spikes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeView === 'spikes' ? 'var(--primary-color)' : 'transparent',
              color: activeView === 'spikes' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Flame size={13} />
            <span>Spikes ({spikes.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'seasonality' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Seasonality Quick Highlight */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#EFF6FF',
            borderRadius: 6,
            border: '1px solid #BFDBFE',
            marginBottom: 12,
            fontSize: '0.75rem',
            color: '#1E40AF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={14} color="#0068FF" />
              <span>
                Peak Demand Day: <strong>{peakDay.dayName}</strong> (~{peakDay.averageQuantity.toFixed(1)} units/day)
              </span>
            </div>
            <span style={{ fontWeight: 600, color: '#0068FF' }}>
              ${peakDay.averageRevenue.toFixed(0)} avg revenue
            </span>
          </div>

          {/* Bar Chart of Seasonality */}
          <div style={{ width: '100%', height: 210, flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalityData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="dayName"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickFormatter={(d: string) => d.slice(0, 3)}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DayOfWeekPattern;
                      return (
                        <div style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: '0.78rem',
                          boxShadow: '0 8px 20px -4px rgba(0,0,0,0.1)',
                          color: 'var(--text-primary)'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                          <div>Avg Demand: <strong>{data.averageQuantity.toFixed(1)} units</strong></div>
                          <div>Avg Revenue: <strong>${data.averageRevenue.toFixed(2)}</strong></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="averageQuantity" radius={[4, 4, 0, 0]}>
                  {seasonalityData.map((entry) => (
                    <Cell
                      key={entry.dayName}
                      fill={entry.dayName === peakDay.dayName ? '#0068FF' : '#93C5FD'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Demand Spikes View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 270 }}>
          {spikes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <AlertCircle size={28} color="#64748B" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: '0.85rem' }}>No extreme demand spikes detected.</div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>
                Demand velocity has stayed within normal confidence bounds.
              </div>
            </div>
          ) : (
            spikes.map((spike, idx) => {
              const spikeDate = new Date(spike.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              return (
                <div
                  key={spike.date || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Flame size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#991B1B' }}>
                        Demand Spike &bull; {spikeDate}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#B91C1C' }}>
                        Surge above rolling threshold
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#DC2626' }}>
                      {spike.totalQuantity} units
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#7F1D1D' }}>
                      ${spike.totalRevenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
