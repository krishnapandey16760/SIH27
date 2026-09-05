import React from 'react';
import AppLayout from '@/components/applayout';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import GanttChartSection from './components/GanttChartSection';
import OptimizationPanel from './components/OptimizationPanel';
import ActivityFeed from './components/ActivityFeed';
import DashboardHeader from './components/DashboardHeader';

// Backend integration: fetch today's block schedule, train movements, and optimization status from /api/block-planning/today
export default function BlockPlanningDashboard() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <DashboardHeader />
        <MetricsBentoGrid />
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <GanttChartSection />
          </div>
          <div className="xl:col-span-1 space-y-4">
            <OptimizationPanel />
            <ActivityFeed />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}