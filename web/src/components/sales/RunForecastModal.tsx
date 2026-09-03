import React, { useState } from 'react';
import { X, Sparkles, BrainCircuit } from 'lucide-react';
import { demandApi } from '../../services/api';
import type { DemandForecast } from '../../types/sales';

interface RunForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForecastGenerated: (forecast: DemandForecast) => void;
}

const PRESET_PRODUCTS = [
  { id: '18464716-8fa7-49da-b521-08b1dc057c28', sku: 'SKU-PARACETAMOL-500', name: 'Paracetamol 500mg (100 Tabs)' },
  { id: '13738190-af11-4289-8ad0-bce865d59402', sku: 'SKU-AMOXICILLIN-250', name: 'Amoxicillin 250mg Capsules' },
  { id: '78412e26-739f-4405-8e6c-a7858bea3817', sku: 'SKU-VITAMINC-1000', name: 'Vitamin C 1000mg Effervescent' },
  { id: '91f24d1a-5b12-4cf0-863a-2395d82046a1', sku: 'SKU-IBUPROFEN-400', name: 'Ibuprofen 400mg Softgels' },
  { id: '52c41829-9e81-42cb-bdfa-345091a18204', sku: 'SKU-OMEPRAZOLE-20', name: 'Omeprazole 20mg Delayed Release' }
];

export const RunForecastModal: React.FC<RunForecastModalProps> = ({
  isOpen,
  onClose,
  onForecastGenerated
}) => {
  const [selectedProductId, setSelectedProductId] = useState(PRESET_PRODUCTS[0].id);
  const [branchName, setBranchName] = useState('Colombo Central Branch');
  const [period, setPeriod] = useState(30);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [currentStockLevel, setCurrentStockLevel] = useState(45);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);

    const product = PRESET_PRODUCTS.find((p) => p.id === selectedProductId) || PRESET_PRODUCTS[0];

    try {
      const forecast = await demandApi.generateForecast({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        branchName,
        period,
        leadTimeDays,
        currentStockLevel
      });

      onForecastGenerated(forecast);
      onClose();
    } catch (err: any) {
      alert('Failed to generate forecast: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--primary-glow)', color: '#818CF8' }}>
              <BrainCircuit size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#FFF', margin: 0 }}>Trigger Demand Forecast Agent</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Autonomous tool-calling & statistical forecasting</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Target Product */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Target Product & SKU
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                color: '#FFF',
                fontSize: '0.875rem'
              }}
            >
              {PRESET_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Branch & Horizon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Branch Location
              </label>
              <select
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  fontSize: '0.875rem'
                }}
              >
                <option value="Colombo Central Branch">Colombo Central Branch</option>
                <option value="Kandy Hillside Branch">Kandy Hillside Branch</option>
                <option value="Galle Port Warehouse">Galle Port Warehouse</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Forecast Horizon
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  fontSize: '0.875rem'
                }}
              >
                <option value={7}>Next 7 Days (Short-term)</option>
                <option value={14}>Next 14 Days (Bi-weekly)</option>
                <option value={30}>Next 30 Days (Monthly Standard)</option>
                <option value={60}>Next 60 Days (Bi-monthly)</option>
                <option value={90}>Next 90 Days (Quarterly Projection)</option>
              </select>
            </div>
          </div>

          {/* Lead Time & Current Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Current Physical Stock
              </label>
              <input
                type="number"
                min={0}
                value={currentStockLevel}
                onChange={(e) => setCurrentStockLevel(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* AI Workflow Note */}
          <div style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            marginBottom: 24,
            fontSize: '0.8rem',
            color: '#C7D2FE',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <Sparkles size={18} color="#818CF8" />
            <div>
              The agent will query transaction logs, evaluate velocity and volatility ($\sigma$), compute ROP & safety stock, and construct 95% confidence intervals.
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isRunning}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isRunning}>
              <Sparkles size={16} />
              {isRunning ? 'Agent Computing...' : 'Execute Demand Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
