import React, { useState } from 'react';
import type { WorkflowState } from '../../types/sales';
import { Bot, CheckCircle2, AlertTriangle, ShieldCheck, X, ChevronRight, Copy, Check, Clock } from 'lucide-react';

interface AgentTraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workflowState: WorkflowState | null;
}

export const AgentTraceDrawer: React.FC<AgentTraceDrawerProps> = ({ isOpen, onClose, workflowState }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'tools' | 'validation' | 'json'>('timeline');

  if (!isOpen || !workflowState) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(workflowState, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalToolDuration = workflowState.toolExecutions.reduce((acc, t) => acc + t.durationMs, 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 680,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
        overflowY: 'auto'
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}>
              <Bot size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Demand Forecast Agent
                </h3>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                  Auditable Trace
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Workflow ID: <code style={{ color: '#6366F1' }}>{workflowState.workflowId}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Objective & Metadata Banner */}
        <div style={{
          padding: '16px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Agent Objective
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 4, fontWeight: 600 }}>
            {workflowState.objective}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <div>Initiated By: <strong style={{ color: 'var(--text-primary)' }}>{workflowState.initiatedBy}</strong></div>
            <div>Step: <strong style={{ color: 'var(--primary-color)' }}>{workflowState.currentStep}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> Total Runtime: <strong style={{ color: '#D97706' }}>{totalToolDuration}ms</strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          gap: 20,
          background: '#F8FAFC'
        }}>
          {[
            { id: 'timeline', label: 'Execution Plan' },
            { id: 'tools', label: `Tools (${workflowState.toolExecutions.length})` },
            { id: 'validation', label: `Guardrails (${workflowState.validationResults.length})` },
            { id: 'json', label: 'Raw State Contract' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
                padding: '14px 4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {workflowState.plan.map((step, idx) => (
                <div key={idx} style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: step.status === 'Completed' ? '#ECFDF5' : '#EFF6FF',
                      color: step.status === 'Completed' ? '#059669' : '#0068FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {step.status === 'Completed' ? <CheckCircle2 size={16} /> : step.stepIndex}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        Step {step.stepIndex}: {step.action}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Status: <span style={{ color: step.status === 'Completed' ? '#059669' : '#D97706', fontWeight: 600 }}>{step.status}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {workflowState.toolExecutions.map((tool, idx) => (
                <div key={idx} style={{
                  padding: 16,
                  borderRadius: 8,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-purple" style={{ fontFamily: 'monospace' }}>
                        {tool.toolName}
                      </span>
                      {tool.isSuccess ? (
                        <span style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Succeeded
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <AlertTriangle size={13} /> Failed
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tool.durationMs}ms</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Input Parameters:</div>
                  <pre style={{
                    margin: '0 0 10px 0',
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: '#1E293B',
                    color: '#93C5FD',
                    fontSize: '0.75rem',
                    overflowX: 'auto'
                  }}>
                    {JSON.stringify(tool.inputParameters, null, 2)}
                  </pre>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Tool Output Payload:</div>
                  <pre style={{
                    margin: 0,
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: '#1E293B',
                    color: '#86EFAC',
                    fontSize: '0.75rem',
                    overflowX: 'auto'
                  }}>
                    {JSON.stringify(tool.outputPayload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'validation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {workflowState.validationResults.map((v, idx) => (
                <div key={idx} style={{
                  padding: 16,
                  borderRadius: 8,
                  backgroundColor: v.passed ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${v.passed ? '#BBF7D0' : '#FECACA'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12
                }}>
                  <div style={{ color: v.passed ? '#059669' : '#DC2626', marginTop: 2 }}>
                    {v.rule === 'PromptInjectionDefense' ? (
                      <ShieldCheck size={20} />
                    ) : v.passed ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertTriangle size={20} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Rule: {v.rule}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {v.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'json' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                  onClick={handleCopyJson}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#F1F5F9',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre style={{
                margin: 0,
                padding: 16,
                borderRadius: 8,
                backgroundColor: '#1E293B',
                color: '#E2E8F0',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                maxHeight: '65vh'
              }}>
                {JSON.stringify(workflowState, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
