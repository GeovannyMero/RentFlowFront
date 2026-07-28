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
import { Apartment, Tenant } from '@/types/database';
import {
  FileText,
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

function NewContractContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [formData, setFormData] = useState({
    apartment_id: searchParams.get('apartment') || '',
    tenant_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    monthly_rent: 0,
    deposit_amount: 0,
    deposit_paid: false,
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
      if (searchParams.get('apartment')) {
        setFormData((prev) => ({ ...prev, apartment_id: searchParams.get('apartment')! }));
      }
    }
  }, [user]);

  const loadData = async () => {
    const { data: apartmentsData } = await supabase
      .from('apartments')
      .select('*')
      .eq('user_id', user!.id)
      .in('status', ['vacant'])
      .order('number');

    // Also get occupied apartments in case user wants to reassign
    const { data: allApartments } = await supabase
      .from('apartments')
      .select('*')
      .eq('user_id', user!.id)
      .order('number');

    setApartments(allApartments || []);

    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user!.id)
      .order('first_name');

    setTenants(tenantsData || []);
  };

  const handleApartmentChange = (apartmentId: string) => {
    const apt = apartments.find((a) => a.id === apartmentId);
    setFormData({
      ...formData,
      apartment_id: apartmentId,
      monthly_rent: apt?.monthly_rent || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Create contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert([
        {
          apartment_id: formData.apartment_id,
          tenant_id: formData.tenant_id,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          monthly_rent: formData.monthly_rent,
          deposit_amount: formData.deposit_amount || null,
          deposit_paid: formData.deposit_paid,
          notes: formData.notes || null,
          status: 'active',
          user_id: user!.id,
        },
      ])
      .select()
      .single();

    if (contractError) {
      console.error('Error creating contract:', contractError);
      setLoading(false);
      return;
    }

    // Update apartment status
    await supabase
      .from('apartments')
      .update({ status: 'occupied' })
      .eq('id', formData.apartment_id);

    // If deposit is paid, create a payment record
    if (formData.deposit_amount > 0 && formData.deposit_paid) {
      await supabase.from('payments').insert([
        {
          contract_id: contract.id,
          amount: formData.deposit_amount,
          payment_date: formData.start_date,
          due_date: formData.start_date,
          payment_type: 'deposit',
          payment_method: 'cash',
          status: 'paid',
          notes: 'Depósito de garantía',
          user_id: user!.id,
        },
      ]);
    }

    // Create first month's rent payment
    const { data: monthPaymentExists } = await supabase
      .from('payments')
      .select('id')
      .eq('contract_id', contract.id)
      .eq('payment_type', 'rent')
      .gte('due_date', formData.start_date)
      .lte('due_date', formData.start_date);

    if (!monthPaymentExists || monthPaymentExists.length === 0) {
      await supabase.from('payments').insert([
        {
          contract_id: contract.id,
          amount: formData.monthly_rent,
          payment_date: formData.start_date,
          due_date: formData.start_date,
          payment_type: 'rent',
          status: 'pending',
          notes: 'Renta del primer mes',
          user_id: user!.id,
        },
      ]);
    }

    router.push(`/apartments/${formData.apartment_id}`);
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
          <h1 className="text-3xl font-bold text-slate-800">Nuevo Contrato</h1>
          <p className="text-slate-500">Crea un contrato de arrendamiento</p>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Información del Contrato
          </CardTitle>
          <CardDescription className="text-slate-500">
            Completa todos los campos requeridos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Apartment Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Departamento *
              </Label>
              <Select
                value={formData.apartment_id}
                onValueChange={handleApartmentChange}
                required
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-800">
                  <SelectValue placeholder="Selecciona un departamento" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {apartments.map((apt) => (
                    <SelectItem
                      key={apt.id}
                      value={apt.id}
                      className="text-slate-700 hover:bg-slate-100"
                    >
                      {apt.name} (Depto. {apt.number})
                      {apt.status === 'occupied' && ' - Ocupado'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Inquilino *
              </Label>
              <Select
                value={formData.tenant_id}
                onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}
                required
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-800">
                  <SelectValue placeholder="Selecciona un inquilino" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {tenants.map((tenant) => (
                    <SelectItem
                      key={tenant.id}
                      value={tenant.id}
                      className="text-slate-700 hover:bg-slate-100"
                    >
                      {tenant.first_name} {tenant.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tenants.length === 0 && (
                <p className="text-sm text-slate-500">
                  No hay inquilinos registrados.{' '}
                  <a href="/tenants" className="text-emerald-600 hover:underline">
                    Crear inquilino
                  </a>
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Inicio *
                </Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Fin
                </Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Renta Mensual *
                </Label>
                <Input
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Depósito de Garantía</Label>
                <Input
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Deposit Paid */}
            {formData.deposit_amount > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deposit_paid"
                  checked={formData.deposit_paid}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, deposit_paid: checked as boolean })
                  }
                />
                <Label htmlFor="deposit_paid" className="text-slate-700">
                  Depósito pagado
                </Label>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-700">Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white border-slate-300"
                rows={3}
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
                disabled={loading || !formData.apartment_id || !formData.tenant_id}
              >
                {loading ? 'Creando...' : 'Crear Contrato'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <NewContractContent />
    </Suspense>
  );
}
