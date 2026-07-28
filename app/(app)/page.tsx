'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  occupationRate: number;
  totalApartments: number;
  occupiedApartments: number;
  pendingPayments: number;
  overduePayments: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    occupationRate: 0,
    totalApartments: 0,
    occupiedApartments: 0,
    pendingPayments: 0,
    overduePayments: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    const currentDate = new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Load apartments
    const { data: apartments } = await supabase
      .from('apartments')
      .select('id, status, monthly_rent');

    // Load monthly payments
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date, status')
      .eq('user_id', user!.id)
      .gte('payment_date', monthStart.toISOString().split('T')[0])
      .lte('payment_date', monthEnd.toISOString().split('T')[0]);

    // Load expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', user!.id)
      .gte('expense_date', monthStart.toISOString().split('T')[0])
      .lte('expense_date', monthEnd.toISOString().split('T')[0]);

    // Pending and overdue payments
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('user_id', user!.id)
      .in('status', ['pending', 'overdue']);

    // Calculate summary
    if (apartments) {
      const totalApts = apartments.length;
      const occupiedApts = apartments.filter((a) => a.status === 'occupied').length;
      const potentialIncome = apartments
        .filter((a) => a.status === 'occupied')
        .reduce((sum, a) => sum + Number(a.monthly_rent), 0);

      const totalIncome = payments
        ?.filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const totalExp = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const pending = pendingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const overdue = payments?.filter((p) => p.status === 'overdue').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setSummary({
        totalIncome,
        totalExpenses: totalExp,
        netIncome: totalIncome - totalExp,
        occupationRate: totalApts > 0 ? (occupiedApts / totalApts) * 100 : 0,
        totalApartments: totalApts,
        occupiedApartments: occupiedApts,
        pendingPayments: pending,
        overduePayments: overdue,
      });
    }

    // Load last 6 months data for chart
    const monthlyDataArray: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      const monthStartD = startOfMonth(monthDate);
      const monthEndD = endOfMonth(monthDate);

      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', user!.id)
        .eq('status', 'paid')
        .gte('payment_date', monthStartD.toISOString().split('T')[0])
        .lte('payment_date', monthEndD.toISOString().split('T')[0]);

      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user!.id)
        .gte('expense_date', monthStartD.toISOString().split('T')[0])
        .lte('expense_date', monthEndD.toISOString().split('T')[0]);

      const income = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const expensesT = monthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      monthlyDataArray.push({
        month: format(monthDate, 'MMM', { locale: es }),
        income,
        expenses: expensesT,
        profit: income - expensesT,
      });
    }
    setMonthlyData(monthlyDataArray);

    // Recent payments
    const { data: recentData } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        status,
        contracts (
          tenant_id,
          tenants (first_name, last_name)
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentPayments(recentData || []);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Resumen de la salud financiera de tu inversión</p>
      </div>

      {/* Financial Health Score */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Salud Financiera
          </CardTitle>
          <CardDescription className="text-slate-500">
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Income vs Expenses */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ingresos vs Gastos</span>
                <span className={summary.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                  {summary.netIncome >= 0 ? '+' : ''}{formatCurrency(summary.netIncome)}
                </span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden bg-slate-200">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${summary.totalIncome > 0 ? (summary.totalIncome / (summary.totalIncome + summary.totalExpenses)) * 100 : 50}%` }}
                />
                <div
                  className="bg-gradient-to-r from-red-500 to-orange-500"
                  style={{ width: `${summary.totalExpenses > 0 ? (summary.totalExpenses / (summary.totalIncome + summary.totalExpenses)) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-500">Ingresos: {formatCurrency(summary.totalIncome)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-500">Gastos: {formatCurrency(summary.totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Occupation Rate */}
            <div className="space-y-4">
              <span className="text-slate-500">Tasa de Ocupación</span>
              <div className="relative pt-1">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className="text-slate-200"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className={summary.occupationRate >= 80 ? 'text-emerald-500' : summary.occupationRate >= 50 ? 'text-yellow-500' : 'text-red-500'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        strokeDasharray={`${summary.occupationRate * 2.51} ${251 - summary.occupationRate * 2.51}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-slate-800">{Math.round(summary.occupationRate)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-slate-500">
                {summary.occupiedApartments} de {summary.totalApartments} departamentos
              </p>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
                <div className="flex items-center justify-between">
                  <Receipt className="h-5 w-5 text-yellow-600" />
                  <span className="text-xs text-yellow-600">Pendiente</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(summary.pendingPayments)}</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                <div className="flex items-center justify-between">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-xs text-red-500">Vencido</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(summary.overduePayments)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="flex items-center gap-1 text-emerald-600 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                Ingresos
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-4">{formatCurrency(summary.totalIncome)}</p>
            <p className="text-sm text-slate-500 mt-1">Este mes</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:border-red-400 hover:shadow-md transition-all shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
              <span className="flex items-center gap-1 text-red-500 text-sm">
                <ArrowDownRight className="h-4 w-4" />
                Gastos
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-4">{formatCurrency(summary.totalExpenses)}</p>
            <p className="text-sm text-slate-500 mt-1">Este mes</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:border-teal-400 hover:shadow-md transition-all shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-teal-50 rounded-lg">
                <Building2 className="h-6 w-6 text-teal-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-4">{summary.occupiedApartments}/{summary.totalApartments}</p>
            <p className="text-sm text-slate-500 mt-1">Departamentos ocupados</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-4">{Math.round(summary.occupationRate)}%</p>
            <p className="text-sm text-slate-500 mt-1">Tasa de ocupación</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Chart */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Ingresos vs Gastos</CardTitle>
            <CardDescription className="text-slate-500">Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#1e293b',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    fill="url(#incomeGradient)"
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    fill="url(#expensesGradient)"
                    strokeWidth={2}
                    name="Gastos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Pagos Recientes</CardTitle>
            <CardDescription className="text-slate-500">Últimas transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No hay pagos registrados</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        payment.status === 'paid' ? 'bg-emerald-50' :
                        payment.status === 'pending' ? 'bg-yellow-50' :
                        'bg-red-50'
                      }`}>
                        <DollarSign className={`h-4 w-4 ${
                          payment.status === 'paid' ? 'text-emerald-600' :
                          payment.status === 'pending' ? 'text-yellow-600' :
                          'text-red-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-slate-800 font-medium">
                          {payment.contracts?.tenants
                            ? `${payment.contracts.tenants.first_name} ${payment.contracts.tenants.last_name}`
                            : 'Sin inquilino'}
                        </p>
                        <p className="text-slate-500 text-sm">
                          {payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-semibold">{formatCurrency(payment.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {payment.status === 'paid' ? 'Pagado' :
                         payment.status === 'pending' ? 'Pendiente' : 'Vencido'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
