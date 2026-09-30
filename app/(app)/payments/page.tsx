'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentInsert } from '@/types/database';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { markPaymentAsPaid, savePayment } from './actions';

interface PaymentData {
  id: string;
  contract_id: string;
  amount: number;
  payment_date: string;
  due_date: string;
  payment_type: 'rent' | 'deposit' | 'late_fee' | 'other';
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  created_at: string;
  contracts: {
    id: string;
    apartment_id: string;
    tenant_id: string;
    monthly_rent: number;
    apartments: { name: string; number: string; id: string };
    tenants: { first_name: string; last_name: string; id: string };
  } | null;
}

function PaymentsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeContracts, setActiveContracts] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PaymentInsert>({
    contract_id: '',
    amount: 0,
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(), 'yyyy-MM-dd'),
    payment_type: 'rent',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    status: 'paid',
    user_id: '',
  });

  useEffect(() => {
    if (user) {
      loadPayments();
      loadContracts();
      if (searchParams.get('contract')) {
        setFormData((prev) => ({ ...prev, contract_id: searchParams.get('contract')! }));
      }
    }
  }, [user]);

  const loadPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select(`
        id,
        contract_id,
        amount,
        payment_date,
        due_date,
        payment_type,
        payment_method,
        reference_number,
        notes,
        status,
        created_at,
        user_id,
        contracts!payments_contract_id_fkey (
          id,
          apartment_id,
          tenant_id,
          monthly_rent,
          apartments (name, number, id),
          tenants (first_name, last_name, id)
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    setPayments((data as any) || []);
    setLoading(false);
  };

  const loadContracts = async () => {
    const { data } = await supabase
      .from('contracts')
      .select(`
        id,
        apartments (name, number, id),
        tenants (first_name, last_name, id)
      `)
      .eq('user_id', user!.id)
      .eq('status', 'active');

    setActiveContracts(data || []);
  };

  const handleOpenDialog = (payment?: PaymentData) => {
    if (payment) {
      setSelectedPayment(payment);
      setFormData({
        contract_id: payment.contract_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        due_date: payment.due_date,
        payment_type: payment.payment_type,
        payment_method: payment.payment_method || 'cash',
        reference_number: payment.reference_number || '',
        notes: payment.notes || '',
        status: payment.status,
        user_id: user!.id,
      });
    } else {
      setSelectedPayment(null);
      setFormData({
        contract_id: searchParams.get('contract') || '',
        amount: 0,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(), 'yyyy-MM-dd'),
        payment_type: 'rent',
        payment_method: 'cash',
        reference_number: '',
        notes: '',
        status: 'paid',
        user_id: user!.id,
      });
    }
    setPaymentDialogOpen(true);
  };

  const handleContractChange = (contractId: string) => {
    const contract = activeContracts.find((c) => c.id === contractId);
    setFormData({
      ...formData,
      contract_id: contractId,
      amount: contract?.monthly_rent || 0,
    });
  };

  const handleSave = async () => {
    if (!formData.contract_id || formData.amount <= 0) return;

    const { error } = await savePayment(selectedPayment?.id ?? null, formData);

    if (!error) {
      loadPayments();
      setPaymentDialogOpen(false);
    }
  };

  const handleMarkAsPaid = async (payment: PaymentData) => {
    await markPaymentAsPaid(payment.id);
    loadPayments();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-600 border-red-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const tenantName = payment.contracts?.tenants
      ? `${payment.contracts.tenants.first_name} ${payment.contracts.tenants.last_name}`
      : '';
    const aptName = payment.contracts?.apartments
      ? `${payment.contracts.apartments.name} ${payment.contracts.apartments.number}`
      : '';

    const matchesSearch =
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aptName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

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
          <h1 className="text-3xl font-bold text-slate-800">Pagos</h1>
          <p className="text-slate-500">Gestiona los pagos de renta y otros conceptos</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-emerald-500 to-teal-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Pendiente por Cobrar</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Pagos Pendientes</p>
                <p className="text-2xl font-bold text-slate-800">{pendingPayments.length}</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Total de Pagos</p>
                <p className="text-2xl font-bold text-slate-800">{payments.length}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por inquilino, departamento o referencia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-slate-300 text-slate-700">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No hay pagos</h3>
            <p className="text-slate-500 text-center mb-4">
              Registra tu primer pago de renta
            </p>
            <Button onClick={() => handleOpenDialog()} variant="outline" className="border-emerald-500 text-emerald-400">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <Card
              key={payment.id}
              className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      payment.status === 'paid' ? 'bg-emerald-50' :
                      payment.status === 'pending' ? 'bg-yellow-50' :
                      'bg-red-50'
                    }`}>
                      <CreditCard className={`h-5 w-5 ${
                        payment.status === 'paid' ? 'text-emerald-600' :
                        payment.status === 'pending' ? 'text-yellow-600' :
                        'text-red-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-slate-800 font-semibold">{formatCurrency(payment.amount)}</p>
                        <Badge className={getStatusColor(payment.status)}>
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        {payment.contracts?.tenants && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {payment.contracts.tenants.first_name} {payment.contracts.tenants.last_name}
                          </span>
                        )}
                        {payment.contracts?.apartments && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {payment.contracts.apartments.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-sm">
                      {format(new Date(payment.due_date), 'dd MMM yyyy', { locale: es })}
                    </p>
                    <p className="text-slate-500 text-xs">Vencimiento</p>
                    <div className="flex gap-2 mt-2">
                      {payment.status !== 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(payment)}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Cobrar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog(payment)}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPayment ? 'Editar Pago' : 'Registrar Pago'}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {selectedPayment ? 'Actualiza la información del pago' : 'Registra un nuevo pago'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Contrato *</Label>
              <Select
                value={formData.contract_id}
                onValueChange={handleContractChange}
                disabled={!!selectedPayment}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Selecciona un contrato" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {activeContracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.apartments.name} - {contract.tenants.first_name} {contract.tenants.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Monto *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                >
                  <SelectTrigger className="bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Fecha de Pago</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Tipo</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(v) => setFormData({ ...formData, payment_type: v as any })}
                >
                  <SelectTrigger className="bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="rent">Renta</SelectItem>
                    <SelectItem value="deposit">Depósito</SelectItem>
                    <SelectItem value="late_fee">Cargo por Mora</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Método de Pago</Label>
                <Select
                  value={formData.payment_method || undefined}
                  onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                >
                  <SelectTrigger className="bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Número de Referencia</Label>
              <Input
                value={formData.reference_number || ''}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="bg-white border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white border-slate-300"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPaymentDialogOpen(false)}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {selectedPayment ? 'Actualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
