import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SalesPageHeader } from '../components/layout/SalesPageHeader';
import { SalesPageIntro } from '../components/layout/SalesPageIntro';
import { ForecastChart } from '../components/sales/ForecastChart';
import { RunForecastModal } from '../components/sales/RunForecastModal';
import { RecordSaleModal } from '../components/sales/RecordSaleModal';
import { useSalesDemandData } from '../hooks/useSalesDemandData';
import { agentApi, demandApi } from '../services/api';
import type { DemandForecast } from '../types/sales';
import '../sales.css';

export default function ForecastingPage() {
  const data = useSalesDemandData();
  const [activeForecast, setActiveForecast] = useState<DemandForecast | null>(null);
  const [forecastHorizon, setForecastHorizon] = useState(30);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [isRunForecastOpen, setIsRunForecastOpen] = useState(false);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);

  const loadForecast = useCallback(async () => {
    setIsForecastLoading(true);
    try {
      const history = await demandApi.getForecastHistory();
      const latest = history[0] ?? null;
      setActiveForecast(latest);
      if (latest?.period) setForecastHorizon(latest.period);
    } catch (error) {
      console.error('Failed to load demand forecast:', error);
      setActiveForecast(null);
    } finally {
      setIsForecastLoading(false);
    }
  }, []);

  useEffect(() => { void loadForecast(); }, [loadForecast]);

  const refresh = useCallback(async () => {
    await Promise.all([data.refresh(), loadForecast()]);
  }, [data.refresh, loadForecast]);

  const handleForecastGenerated = (forecast: DemandForecast) => {
    setActiveForecast(forecast);
    setForecastHorizon(forecast.period);
    void data.refresh();
  };

  const handleHorizonChange = async (days: number) => {
    setForecastHorizon(days);
    const target = activeForecast
      ? { productId: activeForecast.productId, sku: activeForecast.productSku, name: activeForecast.productName }
      : data.availableProducts[0];
    if (!target) return;

    setIsForecastLoading(true);
    try {
      const result = await agentApi.runForecastAgent({
        productId: target.productId,
        productSku: target.sku,
        productName: target.name,
        forecastDays: days,
        leadTimeDays: 7,
        currentStockLevel: 0,
        initiatedBy: 'HorizonSelector',
      });
      if (result.forecast) setActiveForecast(result.forecast);
    } catch (error) {
      console.error('Failed to change forecast horizon:', error);
    } finally {
      setIsForecastLoading(false);
    }
  };

  return (
    <div className="sales-module">
      <SalesPageHeader
        pageLabel="Forecasting"
        branches={data.availableBranches}
        selectedBranch={data.selectedBranch}
        setSelectedBranch={data.setSelectedBranch}
        onRecordSaleClick={() => setIsRecordSaleOpen(true)}
        onForecastClick={() => setIsRunForecastOpen(true)}
        onRefreshData={refresh}
        isRefreshing={data.isRefreshing || isForecastLoading}
        searchQuery={data.searchQuery}
        setSearchQuery={data.setSearchQuery}
        reorderSuggestions={data.filteredSuggestions}
        sales={data.filteredSales}
      />

      <SalesPageIntro
        eyebrow="Demand Intelligence"
        title="Forecasting"
        description="Review forward demand curves, confidence ranges and planning horizons without mixing operational records into the workspace."
        icon={Sparkles}
        meta={activeForecast ? <><strong>{Math.round(activeForecast.confidenceScore * 100)}%</strong><span>model confidence</span></> : <span>No active forecast</span>}
      />

      <ForecastChart
        forecast={activeForecast}
        onTriggerNewForecast={() => setIsRunForecastOpen(true)}
        selectedHorizon={forecastHorizon}
        onHorizonChange={handleHorizonChange}
      />

      <RunForecastModal
        isOpen={isRunForecastOpen}
        onClose={() => setIsRunForecastOpen(false)}
        onForecastGenerated={handleForecastGenerated}
        branches={data.availableBranches}
        products={data.availableProducts}
      />
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCreated={data.refresh}
        branches={data.availableBranches}
        products={data.availableProducts}
      />
    </div>
  );
}
