'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Monitor,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
  Download,
  Settings,
} from 'lucide-react';

// Import monitoring services
import { apiMonitor, type ApiHealthScore, type ApiEndpointMetrics } from '@/lib/monitoring/api-monitor';
import { performanceCollector, type PerformanceMetrics, type PerformanceReport } from '@/lib/monitoring/performance-metrics';
import { errorTracking, type ErrorStats, type ErrorEvent } from '@/lib/monitoring/error-tracking';

// ============================================================================
// Types
// ============================================================================

interface DashboardData {
  apiHealth: ApiHealthScore | null;
  apiMetrics: ApiEndpointMetrics[];
  performance: PerformanceReport | null;
  errors: ErrorStats;
  recentErrors: ErrorEvent[];
}

// ============================================================================
// Monitoring Dashboard Component
// ============================================================================

export function MonitoringDashboard() {
  const [data, setData] = useState<DashboardData>({
    apiHealth: null,
    apiMetrics: [],
    performance: null,
    errors: {
      total: 0,
      byType: {} as any,
      byCategory: {} as any,
      bySeverity: {} as any,
      resolved: 0,
      unresolved: 0,
      affectedUsers: 0,
      errorRate: 0,
      trend: 'stable',
    },
    recentErrors: [],
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Fetch dashboard data
  const fetchData = () => {
    const apiHealth = apiMonitor.getHealthScore();
    const apiMetrics = apiMonitor.getEndpointMetrics();
    const performanceMetrics = performanceCollector.getLatestMetrics();
    const errors = errorTracking.getStats();
    const recentErrors = errorTracking.getErrors({ limit: 10 });

    // Generate performance report
    let performanceReport = null;
    if (performanceMetrics) {
      const violations: any[] = [];
      const score = 85; // Calculate based on metrics
      performanceReport = {
        metrics: performanceMetrics,
        violations,
        score,
        grade: 'B' as const,
        recommendations: [],
      };
    }

    setData({
      apiHealth,
      apiMetrics,
      performance: performanceReport,
      errors,
      recentErrors,
    });
  };

  // Set up auto-refresh
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeHealth = apiMonitor.on('health-score', fetchData);
    const unsubscribeAlert = apiMonitor.on('alert', fetchData);

    return () => {
      apiMonitor.off('health-score', fetchData);
      apiMonitor.off('alert', fetchData);
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for your application
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <HealthCard
          title="API Health"
          value={data.apiHealth?.overall || 0}
          status={data.apiHealth?.status || 'unknown'}
          icon={<Server className="h-4 w-4" />}
        />
        <HealthCard
          title="Performance Score"
          value={data.performance?.score || 0}
          grade={data.performance?.grade}
          icon={<Zap className="h-4 w-4" />}
        />
        <HealthCard
          title="Error Rate"
          value={100 - data.errors.errorRate}
          trend={data.errors.trend}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <HealthCard
          title="Active Users"
          value={data.errors.affectedUsers}
          isCount
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="api" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api">API Monitoring</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* API Monitoring Tab */}
        <TabsContent value="api" className="space-y-4">
          <ApiMonitoringTab data={data} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab performance={data.performance} />
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <ErrorsTab errors={data.errors} recentErrors={data.recentErrors} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Health Card Component
// ============================================================================

function HealthCard({
  title,
  value,
  status,
  grade,
  trend,
  isCount,
  icon,
}: {
  title: string;
  value: number;
  status?: string;
  grade?: string;
  trend?: string;
  isCount?: boolean;
  icon: React.ReactNode;
}) {
  const getStatusColor = () => {
    if (status === 'healthy') return 'text-green-500';
    if (status === 'degraded') return 'text-yellow-500';
    if (status === 'unhealthy') return 'text-red-500';
    if (grade === 'A') return 'text-green-500';
    if (grade === 'B') return 'text-blue-500';
    if (grade === 'C') return 'text-yellow-500';
    if (grade === 'D' || grade === 'F') return 'text-red-500';
    if (value >= 90) return 'text-green-500';
    if (value >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrendIcon = () => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {isCount ? value : grade || `${value.toFixed(0)}%`}
          </div>
          {getTrendIcon()}
        </div>
        {status && (
          <Badge variant={status === 'healthy' ? 'default' : status === 'degraded' ? 'secondary' : 'destructive'}>
            {status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// API Monitoring Tab
// ============================================================================

function ApiMonitoringTab({ data }: { data: DashboardData }) {
  // Prepare chart data
  const latencyData = data.apiMetrics.slice(0, 10).map(m => ({
    endpoint: `${m.method} ${m.endpoint.slice(0, 30)}...`,
    p50: m.p50Latency,
    p90: m.p90Latency,
    p95: m.p95Latency,
  }));

  const errorRateData = data.apiMetrics.slice(0, 10).map(m => ({
    endpoint: `${m.method} ${m.endpoint.slice(0, 30)}...`,
    errorRate: m.errorRate * 100,
  }));

  return (
    <>
      {/* API Health Issues */}
      {data.apiHealth?.issues && data.apiHealth.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Health Issues</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside">
              {data.apiHealth.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>API Latency (ms)</CardTitle>
            <CardDescription>P50, P90, and P95 latency by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="p50" fill="#10b981" name="P50" />
                <Bar dataKey="p90" fill="#f59e0b" name="P90" />
                <Bar dataKey="p95" fill="#ef4444" name="P95" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>API Error Rates (%)</CardTitle>
            <CardDescription>Error percentage by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={errorRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="errorRate" fill="#ef4444" name="Error Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Details</CardTitle>
          <CardDescription>Detailed metrics for all API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Endpoint</th>
                  <th className="text-right p-2">Requests</th>
                  <th className="text-right p-2">Avg Latency</th>
                  <th className="text-right p-2">P95 Latency</th>
                  <th className="text-right p-2">Error Rate</th>
                  <th className="text-right p-2">Throughput</th>
                </tr>
              </thead>
              <tbody>
                {data.apiMetrics.map((metric, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">
                      <Badge variant="outline" className="mr-2">{metric.method}</Badge>
                      <span className="text-sm">{metric.endpoint}</span>
                    </td>
                    <td className="text-right p-2">{metric.totalRequests}</td>
                    <td className="text-right p-2">{metric.averageLatency.toFixed(0)}ms</td>
                    <td className="text-right p-2">{metric.p95Latency.toFixed(0)}ms</td>
                    <td className="text-right p-2">
                      <Badge variant={metric.errorRate > 0.05 ? 'destructive' : 'default'}>
                        {(metric.errorRate * 100).toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="text-right p-2">{metric.throughput.toFixed(2)} req/s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// Performance Tab
// ============================================================================

function PerformanceTab({ performance }: { performance: PerformanceReport | null }) {
  if (!performance) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  const webVitals = [
    { name: 'LCP', value: performance.metrics.lcp, threshold: 2500, unit: 'ms' },
    { name: 'FID', value: performance.metrics.fid, threshold: 100, unit: 'ms' },
    { name: 'CLS', value: performance.metrics.cls, threshold: 0.1, unit: '' },
    { name: 'FCP', value: performance.metrics.fcp, threshold: 1800, unit: 'ms' },
    { name: 'TTFB', value: performance.metrics.ttfb, threshold: 800, unit: 'ms' },
  ].filter(v => v.value !== undefined);

  return (
    <>
      {/* Performance Recommendations */}
      {performance.recommendations.length > 0 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertTitle>Performance Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside">
              {performance.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Core Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals</CardTitle>
          <CardDescription>Key metrics that impact user experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webVitals.map((vital) => (
              <div key={vital.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{vital.name}</span>
                  <span>
                    {vital.value?.toFixed(vital.unit ? 0 : 2)}{vital.unit}
                    {vital.value && vital.value > vital.threshold && (
                      <Badge variant="destructive" className="ml-2">Needs Improvement</Badge>
                    )}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (vital.value! / vital.threshold) * 100)}
                  className={vital.value! > vital.threshold ? 'bg-red-100' : 'bg-green-100'}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Timing */}
      {performance.metrics.resources && performance.metrics.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Loading</CardTitle>
            <CardDescription>Time spent loading different resource types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getResourceTypeData(performance.metrics.resources)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}ms`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getResourceTypeData(performance.metrics.resources).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ============================================================================
// Errors Tab
// ============================================================================

function ErrorsTab({ errors, recentErrors }: { errors: ErrorStats; recentErrors: ErrorEvent[] }) {
  // Prepare chart data
  const severityData = Object.entries(errors.bySeverity).map(([key, value]) => ({
    name: key,
    value,
  }));

  const categoryData = Object.entries(errors.byCategory).map(([key, value]) => ({
    name: key,
    value,
  }));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Error Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Severity</CardTitle>
            <CardDescription>Distribution of errors by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'critical'
                          ? '#ef4444'
                          : entry.name === 'high'
                          ? '#f59e0b'
                          : entry.name === 'medium'
                          ? '#3b82f6'
                          : '#10b981'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Category</CardTitle>
            <CardDescription>Distribution of errors by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Latest error events in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {recentErrors.map((error) => (
                <Alert key={error.id} variant={error.metadata.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{error.message}</span>
                    <div className="flex gap-2">
                      <Badge variant={error.metadata.resolved ? 'default' : 'destructive'}>
                        {error.metadata.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                      <Badge variant="outline">{error.metadata.severity}</Badge>
                      <Badge variant="outline">{error.count} occurrences</Badge>
                    </div>
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>First seen: {new Date(error.firstSeen).toLocaleString()}</span>
                      <span className="ml-4">Last seen: {new Date(error.lastSeen).toLocaleString()}</span>
                      {error.context.userId && <span className="ml-4">User: {error.context.userId}</span>}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// Analytics Tab
// ============================================================================

function AnalyticsTab() {
  // This would integrate with user analytics data
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Analytics</CardTitle>
        <CardDescription>User behavior and engagement metrics</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Analytics data will be displayed here</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function getResourceTypeData(resources: any[]) {
  const typeMap: Record<string, number> = {};

  resources.forEach((resource) => {
    if (!typeMap[resource.type]) {
      typeMap[resource.type] = 0;
    }
    typeMap[resource.type] += resource.duration;
  });

  return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
}

export default MonitoringDashboard;