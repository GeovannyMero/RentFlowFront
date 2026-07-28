'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PaymentInsert } from '@/types/database';
import {
  CreditCard,
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';

function NewPaymentContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeContracts, setActiveContracts] = useState<any[]>([]);
  const [formData, setFormData] = useState<PaymentInsert>({
    contract_id: searchParams.get('contract') || '',
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
      loadContracts();
      if (searchParams.get('contract')) {
        loadContractDetails(searchParams.get('contract')!);
      }
    }
  }, [user]);

  const loadContracts = async () => {
    const { data } = await supabase
      .from('contracts')
      .select(`
        id,
        monthly_rent,
        apartments (name, number, id),
        tenants (first_name, last_name, id)
      `)
      .eq('user_id', user!.id)
      .eq('status', 'active');

    setActiveContracts(data || []);
  };

  const loadContractDetails = async (contractId: string) => {
    const { data } = await supabase
      .from('contracts')
      .select('monthly_rent')
      .eq('id', contractId)
      .single();

    if (data) {
      setFormData((prev) => ({ ...prev, amount: data.monthly_rent }));
    }
  };

  const handleContractChange = (contractId: string) => {
    const contract = activeContracts.find((c) => c.id === contractId);
    setFormData({
      ...formData,
      contract_id: contractId,
      amount: contract?.monthly_rent || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('payments').insert([
      {
        ...formData,
        user_id: user!.id,
      },
    ]);

    if (!error) {
      router.push('/payments');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Registrar Pago</h1>
          <p className="text-slate-500">Registra un nuevo pago de renta</p>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Información del Pago
          </CardTitle>
          <CardDescription className="text-slate-500">
            Completa todos los campos requeridos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contract Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Contrato *
              </Label>
              <Select
                value={formData.contract_id}
                onValueChange={handleContractChange}
                required
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-800">
                  <SelectValue placeholder="Selecciona un contrato" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {activeContracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.apartments.name} (Depto. {contract.apartments.number}) - {contract.tenants.first_name} {contract.tenants.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monto *
                </Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Estado del Pago</Label>
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Pago
                </Label>
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

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Tipo de Pago</Label>
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

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-slate-700">Número de Referencia</Label>
              <Input
                value={formData.reference_number || ''}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="bg-white border-slate-300"
                placeholder="Opcional"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-700">Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white border-slate-300"
                rows={3}
                placeholder="Notas adicionales..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="text-slate-500 hover:text-slate-900"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={loading || !formData.contract_id || formData.amount <= 0}
              >
                {loading ? 'Registrando...' : 'Registrar Pago'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <NewPaymentContent />
    </Suspense>
  );
}
