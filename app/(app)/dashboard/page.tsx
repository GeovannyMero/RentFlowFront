'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Building2,
  DollarSign,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

    const { data: apartments } = await supabase
      .from('apartments')
      .select('id, status, monthly_rent');

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date, status')
      .eq('user_id', user!.id)
      .gte('payment_date', monthStart.toISOString().split('T')[0])
      .lte('payment_date', monthEnd.toISOString().split('T')[0]);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', user!.id)
      .gte('expense_date', monthStart.toISOString().split('T')[0])
      .lte('expense_date', monthEnd.toISOString().split('T')[0]);

    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('user_id', user!.id)
      .in('status', ['pending', 'overdue']);

    if (apartments) {
      const totalApts = apartments.length;
      const occupiedApts = apartments.filter((a) => a.status === 'occupied').length;
      const totalIncome = payments?.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Resumen de la salud financiera de tu inversión</p>
      </div>

      {/* Financial Health Card */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Salud Financiera
          </CardTitle>
          <CardDescription className="text-slate-500">
            Indicadores clave del mes actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">Ingresos vs Gastos</span>
                <span className={`font-semibold ${summary.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {summary.netIncome >= 0 ? '+' : ''}{formatCurrency(summary.netIncome)}
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${summary.totalIncome > 0 ? (summary.totalIncome / (summary.totalIncome + summary.totalExpenses)) * 100 : 50}%` }}
                />
                <div
                  className="bg-gradient-to-r from-red-400 to-orange-400 transition-all"
                  style={{ width: `${summary.totalExpenses > 0 ? (summary.totalExpenses / (summary.totalIncome + summary.totalExpenses)) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-500">Ingresos: {formatCurrency(summary.totalIncome)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-slate-500">Gastos: {formatCurrency(summary.totalExpenses)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-slate-500 text-sm">Tasa de Ocupación</span>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="none" />
                    <circle
                      cx="48" cy="48" r="40"
                      className={summary.occupationRate >= 80 ? 'text-emerald-500' : summary.occupationRate >= 50 ? 'text-yellow-500' : 'text-red-400'}
                      strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="none"
                      strokeDasharray={`${summary.occupationRate * 2.51} ${251 - summary.occupationRate * 2.51}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">{Math.round(summary.occupationRate)}%</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500">
                {summary.occupiedApartments} de {summary.totalApartments} departamentos
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <Receipt className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-yellow-600 font-medium">Pendiente</span>
                </div>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.pendingPayments)}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-500 font-medium">Vencido</span>
                </div>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.overduePayments)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos este mes', value: formatCurrency(summary.totalIncome), icon: DollarSign, color: 'emerald' },
          { label: 'Gastos este mes', value: formatCurrency(summary.totalExpenses), icon: TrendingDown, color: 'red' },
          { label: 'Departamentos ocupados', value: `${summary.occupiedApartments}/${summary.totalApartments}`, icon: Building2, color: 'teal' },
          { label: 'Tasa de ocupación', value: `${Math.round(summary.occupationRate)}%`, icon: TrendingUp, color: 'blue' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className={`inline-flex p-2 rounded-lg bg-${stat.color}-50`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-3">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGradient)" strokeWidth={2} name="Ingresos" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expensesGradient)" strokeWidth={2} name="Gastos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Pagos Recientes</CardTitle>
            <CardDescription className="text-slate-500">Últimas transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No hay pagos registrados</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${payment.status === 'paid' ? 'bg-emerald-50' :
                        payment.status === 'pending' ? 'bg-yellow-50' : 'bg-red-50'
                        }`}>
                        <DollarSign className={`h-4 w-4 ${payment.status === 'paid' ? 'text-emerald-600' :
                          payment.status === 'pending' ? 'text-yellow-600' : 'text-red-500'
                          }`} />
                      </div>
                      <div>
                        <p className="text-slate-800 font-medium text-sm">
                          {payment.contracts?.tenants
                            ? `${payment.contracts.tenants.first_name} ${payment.contracts.tenants.last_name}`
                            : 'Sin inquilino'}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
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
