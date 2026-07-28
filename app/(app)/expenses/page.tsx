'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Expense, Apartment } from '@/types/database';
import {
  Receipt,
  Search,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Wrench,
  Zap,
  Hammer,
  Shield,
  FileText,
  Briefcase,
  MoreHorizontal,
  Calendar,
  Building2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const categoryIcons: Record<string, React.ReactNode> = {
  maintenance: <Wrench className="h-4 w-4" />,
  utilities: <Zap className="h-4 w-4" />,
  repairs: <Hammer className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  taxes: <FileText className="h-4 w-4" />,
  management: <Briefcase className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  maintenance: 'Mantenimiento',
  utilities: 'Servicios',
  repairs: 'Reparaciones',
  insurance: 'Seguro',
  taxes: 'Impuestos',
  management: 'Administración',
  other: 'Otro',
};

const expenseTypeLabels: Record<string, string> = {
  vacancy_maintenance: 'Mantenimiento por Vacancia',
  rented: 'Departamento Alquilado',
};

const expenseTypeColors: Record<string, string> = {
  vacancy_maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
  rented: 'bg-green-100 text-green-700 border-green-200',
};

const categoryColors: Record<string, string> = {
  maintenance: 'bg-blue-100 text-blue-700 border-blue-200',
  utilities: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  repairs: 'bg-orange-100 text-orange-700 border-orange-200',
  insurance: 'bg-purple-100 text-purple-700 border-purple-200',
  taxes: 'bg-red-100 text-red-700 border-red-200',
  management: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<(Expense & { apartments?: Apartment })[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    apartment_id: 'none',
    category: 'maintenance',
    expense_type: 'rented' as 'vacancy_maintenance' | 'rented',
    description: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const loadExpenses = async () => {
    if (!user) return;

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*, apartments(*)')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });

    const { data: apartmentsData } = await supabase
      .from('apartments')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    setExpenses(expensesData || []);
    setApartments(apartmentsData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        apartment_id: expense.apartment_id || 'none',
        category: expense.category,
        expense_type: expense.expense_type || 'rented',
        description: expense.description,
        amount: expense.amount.toString(),
        expense_date: expense.expense_date,
        notes: expense.notes || '',
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        apartment_id: 'none',
        category: 'maintenance',
        expense_type: 'rented',
        description: '',
        amount: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description || !formData.amount || !formData.expense_date) {
      toast({
        title: 'Error',
        description: 'Completa los campos requeridos.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      apartment_id: formData.apartment_id === 'none' ? null : formData.apartment_id,
      category: formData.category,
      expense_type: formData.expense_type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      expense_date: formData.expense_date,
      notes: formData.notes || null,
      user_id: user!.id,
    };

    if (selectedExpense) {
      const { error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', selectedExpense.id);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo actualizar el gasto.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Gasto actualizado', description: 'Los cambios se guardaron correctamente.' });
    } else {
      const { error } = await supabase.from('expenses').insert(payload);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo registrar el gasto.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Gasto registrado', description: 'El gasto se registró correctamente.' });
    }

    setDialogOpen(false);
    loadExpenses();
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    const { error } = await supabase.from('expenses').delete().eq('id', selectedExpense.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el gasto.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Gasto eliminado', description: 'El gasto se eliminó correctamente.' });
    setDeleteDialogOpen(false);
    setSelectedExpense(null);
    loadExpenses();
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.apartments?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesExpenseType = expenseTypeFilter === 'all' || expense.expense_type === expenseTypeFilter;
    return matchesSearch && matchesCategory && matchesExpenseType;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gastos</h1>
          <p className="text-slate-500">Registra y gestiona los gastos de tus propiedades</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total de Gastos</p>
              <p className="text-2xl font-bold text-slate-800">
                ${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <Receipt className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar gastos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <Select value={expenseTypeFilter} onValueChange={setExpenseTypeFilter}>
          <SelectTrigger className="w-full sm:w-52 bg-white border-slate-300 text-slate-700">
            <SelectValue placeholder="Tipo de gasto" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(expenseTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-slate-300 text-slate-700">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No hay gastos</h3>
            <p className="text-slate-500 text-center mb-4">
              Comienza registrando tu primer gasto
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Card
              key={expense.id}
              className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg border ${categoryColors[expense.category]}`}>
                      {categoryIcons[expense.category]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{expense.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(expense.expense_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                        {expense.apartments && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {expense.apartments.name}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${expenseTypeColors[expense.expense_type || 'rented']}`}>
                          {expenseTypeLabels[expense.expense_type || 'rented']}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColors[expense.category]}`}>
                          {categoryLabels[expense.category]}
                        </span>
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-slate-400 mt-2">{expense.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-slate-800">
                      ${Number(expense.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-800">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border-slate-200 shadow-lg">
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(expense)}
                          className="text-slate-700 hover:bg-slate-50"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedExpense(expense);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {selectedExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {selectedExpense ? 'Actualiza la información del gasto' : 'Registra un nuevo gasto'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Departamento</Label>
              <Select
                value={formData.apartment_id}
                onValueChange={(v) => setFormData({ ...formData, apartment_id: v })}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Selecciona un departamento (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="none">Ninguno</SelectItem>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name} - Depto. {apt.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Tipo de Gasto *</Label>
              <Select
                value={formData.expense_type}
                onValueChange={(v: 'vacancy_maintenance' | 'rented') => setFormData({ ...formData, expense_type: v })}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {Object.entries(expenseTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {formData.expense_type === 'vacancy_maintenance'
                  ? 'Gastos cuando el departamento está desocupado'
                  : 'Gastos cuando el departamento está alquilado'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Descripción *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej. Reparación de plomería"
                className="bg-white border-slate-300"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Fecha *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="bg-white border-slate-300"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalles adicionales..."
                className="bg-white border-slate-300"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              {selectedExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              Eliminar Gasto
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              ¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
