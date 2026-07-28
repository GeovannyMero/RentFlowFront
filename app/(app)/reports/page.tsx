'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, subYears, startOfYear, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

interface YearlyData {
  year: string;
  income: number;
  expenses: number;
  profit: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6months');
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    averageIncome: 0,
    averageExpenses: 0,
    profitMargin: 0,
    growthRate: 0,
  });

  useEffect(() => {
    if (user) {
      loadReportsData();
    }
  }, [user, period]);

  const loadReportsData = async () => {
    setLoading(true);
    const currentDate = new Date();
    let startDate: Date;

    switch (period) {
      case '3months':
        startDate = subMonths(currentDate, 3);
        break;
      case '6months':
        startDate = subMonths(currentDate, 6);
        break;
      case '12months':
        startDate = subMonths(currentDate, 12);
        break;
      case 'all':
        startDate = subYears(currentDate, 5);
        break;
      default:
        startDate = subMonths(currentDate, 6);
    }

    // Load monthly payments
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date, status')
      .eq('user_id', user!.id)
      .eq('status', 'paid')
      .gte('payment_date', format(startDate, 'yyyy-MM-dd'));

    // Load expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date, category')
      .eq('user_id', user!.id)
      .gte('expense_date', format(startDate, 'yyyy-MM-dd'));

    // Process monthly data
    const months = eachMonthOfInterval({ start: startDate, end: currentDate });
    const monthlyDataArray: MonthlyData[] = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthPayments = payments?.filter((p) => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const monthExpenses = expenses?.filter((e) => {
        const expenseDate = new Date(e.expense_date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });

      const income = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const expenseTotal = monthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      return {
        month: format(month, 'MMM yyyy', { locale: es }),
        income,
        expenses: expenseTotal,
        profit: income - expenseTotal,
      };
    });

    setMonthlyData(monthlyDataArray);

    // Process yearly data
    const years = new Set<number>();
    payments?.forEach((p) => years.add(new Date(p.payment_date).getFullYear()));
    expenses?.forEach((e) => years.add(new Date(e.expense_date).getFullYear()));

    const yearlyDataArray: YearlyData[] = Array.from(years).sort().map((year) => {
      const yearPayments = payments?.filter((p) => new Date(p.payment_date).getFullYear() === year);
      const yearExpenses = expenses?.filter((e) => new Date(e.expense_date).getFullYear() === year);

      const income = yearPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const expenseTotal = yearExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      return {
        year: year.toString(),
        income,
        expenses: expenseTotal,
        profit: income - expenseTotal,
      };
    });

    setYearlyData(yearlyDataArray);

    // Process expense categories
    const categoryTotals: Record<string, number> = {};
    expenses?.forEach((e) => {
      const category = e.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(e.amount);
    });

    const categoryLabels: Record<string, string> = {
      maintenance: 'Mantenimiento',
      utilities: 'Servicios',
      repairs: 'Reparaciones',
      insurance: 'Seguros',
      taxes: 'Impuestos',
      management: 'Administración',
      other: 'Otros',
    };

    const expenseCategoryArray: ExpenseCategory[] = Object.entries(categoryTotals)
      .map(([key, value], index) => ({
        name: categoryLabels[key] || key,
        value,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    setExpenseCategories(expenseCategoryArray);

    // Calculate summary
    const totalIncome = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const monthsWithIncome = monthlyDataArray.filter((m) => m.income > 0).length || 1;
    const monthsWithExpenses = monthlyDataArray.filter((m) => m.expenses > 0).length || 1;

    setSummary({
      totalIncome,
      totalExpenses,
      averageIncome: totalIncome / monthsWithIncome,
      averageExpenses: totalExpenses / monthsWithExpenses,
      profitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      growthRate: monthlyDataArray.length >= 2
        ? ((monthlyDataArray[monthlyDataArray.length - 1].income - monthlyDataArray[0].income) / monthlyDataArray[0].income) * 100
        : 0,
    });

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Mes,Ingresos,Gastos,Ganancia\n";
    monthlyData.forEach((data) => {
      csvContent += `${data.month},${data.income},${data.expenses},${data.profit}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
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
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Reportes</h1>
          <p className="text-slate-500">Análisis financiero de tus propiedades</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 bg-white border-slate-300 text-slate-700">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="3months">3 meses</SelectItem>
              <SelectItem value="6months">6 meses</SelectItem>
              <SelectItem value="12months">12 meses</SelectItem>
              <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Ingresos Totales</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalIncome)}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Promedio: {formatCurrency(summary.averageIncome)}/mes</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Gastos Totales</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Promedio: {formatCurrency(summary.averageExpenses)}/mes</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Margen de Ganancia</p>
                <p className="text-2xl font-bold text-slate-800">{summary.profitMargin.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-cyan-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {summary.profitMargin >= 50 ? 'Excelente' : summary.profitMargin >= 30 ? 'Bueno' : 'Necesita mejorar'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Ganancia Neta</p>
                <p className={`text-2xl font-bold ${summary.totalIncome - summary.totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(summary.totalIncome - summary.totalExpenses)}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Tendencia de Ingresos vs Gastos</CardTitle>
            <CardDescription className="text-slate-500">
              Evolución mensual del flujo de efectivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGradientReport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGradientReport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
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
                    fill="url(#incomeGradientReport)"
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    fill="url(#expensesGradientReport)"
                    strokeWidth={2}
                    name="Gastos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profit Chart */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Ganancia Mensual</CardTitle>
            <CardDescription className="text-slate-500">
              Ingresos menos gastos por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#1e293b',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Ganancia']}
                  />
                  <Bar
                    dataKey="profit"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  >
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profit >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories Pie Chart */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Distribución de Gastos</CardTitle>
            <CardDescription className="text-slate-500">
              Por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategories.length > 0 ? (
              <div className="h-72 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#1e293b',
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {expenseCategories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-slate-600 text-sm">{category.name}</span>
                      </div>
                      <span className="text-slate-800 font-medium">{formatCurrency(category.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">
                No hay gastosregistrados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Yearly Comparison */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Comparación Anual</CardTitle>
            <CardDescription className="text-slate-500">
              Rendimiento por año
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#1e293b',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
