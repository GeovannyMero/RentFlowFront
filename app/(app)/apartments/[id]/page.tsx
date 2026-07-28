'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Apartment, ContractWithRelations, Payment, Expense } from '@/types/database';
import {
  Building2,
  ArrowLeft,
  Bed,
  Bath,
  Maximize,
  Calendar,
  User,
  CreditCard,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Clock,
  DollarSign,
  XCircle,
  Receipt,
  Wrench,
  Zap,
  Hammer,
  Shield,
  MoreHorizontal,
  Briefcase,
} from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function ApartmentDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [contract, setContract] = useState<ContractWithRelations | null>(null);
  const [payments, setPayments] = useState<(Payment & { status: string })[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { toast } = useToast();
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationNotes, setTerminationNotes] = useState('');
  const [terminating, setTerminating] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      loadApartmentDetails();
    }
  }, [user, params.id]);

  const loadApartmentDetails = async () => {
    setLoading(true);

    // Load apartment
    const { data: apartmentData } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (apartmentData) {
      setApartment(apartmentData);

      // Load active contract
      const { data: contractData } = await supabase
        .from('contracts')
        .select(`
          *,
          apartment:apartments(*),
          tenant:tenants(*)
        `)
        .eq('apartment_id', params.id)
        .eq('status', 'active')
        .single();

      if (contractData) {
        setContract(contractData as ContractWithRelations);

        // Load payments for this contract
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('contract_id', contractData.id)
          .order('due_date', { ascending: false });

        setPayments(paymentsData || []);
      }

      // Load expenses for this apartment
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('apartment_id', params.id)
        .order('expense_date', { ascending: false });

      setExpenses(expensesData || []);
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'vacant':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'Ocupado';
      case 'vacant':
        return 'Vacío';
      case 'maintenance':
        return 'Mantenimiento';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  const handleTerminateContract = async () => {
    if (!contract || !terminationReason) return;
    setTerminating(true);

    const { error: contractError } = await supabase
      .from('contracts')
      .update({
        status: 'terminated',
        end_date: terminationDate,
        termination_date: terminationDate,
        termination_reason: terminationReason,
      })
      .eq('id', contract.id);

    if (contractError) {
      toast({
        title: 'Error',
        description: 'No se pudo terminar el contrato.',
        variant: 'destructive',
      });
      setTerminating(false);
      return;
    }

    const { error: terminationError } = await supabase
      .from('contract_terminations')
      .insert({
        contract_id: contract.id,
        termination_date: terminationDate,
        reason: terminationReason,
        notes: terminationNotes,
      });

    if (terminationError) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la terminación.',
        variant: 'destructive',
      });
      setTerminating(false);
      return;
    }

    const { error: apartmentError } = await supabase
      .from('apartments')
      .update({ status: 'vacant' })
      .eq('id', apartment!.id);

    if (apartmentError) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el departamento.',
        variant: 'destructive',
      });
      setTerminating(false);
      return;
    }

    toast({
      title: 'Contrato terminado',
      description: 'El contrato ha sido finalizado exitosamente.',
    });

    setTerminateDialogOpen(false);
    setTerminating(false);
    loadApartmentDetails();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-16 w-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Departamento no encontrado</h3>
        <Button onClick={() => router.push('/apartments')} variant="outline">
          Volver a Departamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/apartments')}
            className="text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-800">{apartment.name}</h1>
              <Badge className={getStatusColor(apartment.status)}>
                {getStatusLabel(apartment.status)}
              </Badge>
            </div>
            <p className="text-slate-500">Departamento {apartment.number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {apartment.status === 'vacant' && (
            <Link href={`/contracts/new?apartment=${apartment.id}`}>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
                <FileText className="h-4 w-4 mr-2" />
                Nuevo Contrato
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Apartment Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Detalles del Departamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Bed className="h-4 w-4" />
                <span>{apartment.bedrooms} Recámaras</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Bath className="h-4 w-4" />
                <span>{apartment.bathrooms} Baños</span>
              </div>
              {apartment.area && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Maximize className="h-4 w-4" />
                  <span>{apartment.area} m²</span>
                </div>
              )}
              {apartment.floor && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Building2 className="h-4 w-4" />
                  <span>Piso {apartment.floor}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-slate-500 text-sm">Renta Mensual</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(apartment.monthly_rent)}</p>
            </div>

            {apartment.description && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-slate-500 text-sm mb-2">Descripción</p>
                <p className="text-slate-800">{apartment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract and Payments */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contract" className="space-y-4">
            <TabsList className="bg-slate-100 border border-slate-200">
              <TabsTrigger value="contract" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                Contrato
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                Historial de Pagos
              </TabsTrigger>
              <TabsTrigger value="expenses" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                Gastos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contract">
              {contract ? (
                <div className="space-y-4">
                  {/* Tenant Info */}
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <User className="h-5 w-5 text-emerald-600" />
                        Información del Inquilino
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-slate-500 text-sm">Nombre completo</p>
                            <p className="text-slate-800 font-medium">
                              {contract.tenant.first_name} {contract.tenant.last_name}
                            </p>
                          </div>
                          {contract.tenant.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <a href={`mailto:${contract.tenant.email}`} className="text-emerald-600 hover:underline">
                                {contract.tenant.email}
                              </a>
                            </div>
                          )}
                          {contract.tenant.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <a href={`tel:${contract.tenant.phone}`} className="text-emerald-600 hover:underline">
                                {contract.tenant.phone}
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {contract.tenant.emergency_contact && (
                            <div>
                              <p className="text-slate-500 text-sm">Contacto de emergencia</p>
                              <p className="text-slate-800">{contract.tenant.emergency_contact}</p>
                              {contract.tenant.emergency_phone && (
                                <p className="text-slate-500 text-sm">{contract.tenant.emergency_phone}</p>
                              )}
                            </div>
                          )}
                          {contract.tenant.identification_number && (
                            <div>
                              <p className="text-slate-500 text-sm">Identificación</p>
                              <p className="text-slate-800">{contract.tenant.identification_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contract Details */}
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        Detalles del Contrato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-slate-500 text-sm flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Inicio
                          </p>
                          <p className="text-slate-800 font-medium mt-1">
                            {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-slate-500 text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Duración
                          </p>
                          <p className="text-slate-800 font-medium mt-1">
                            {contract.end_date
                              ? `${differenceInMonths(new Date(contract.end_date), new Date(contract.start_date))} meses`
                              : 'Indefinido'}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-slate-500 text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Renta Mensual
                          </p>
                          <p className="text-slate-800 font-medium mt-1">
                            {formatCurrency(contract.monthly_rent)}
                          </p>
                        </div>
                        {contract.deposit_amount && (
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-slate-500 text-sm">Depósito</p>
                            <p className="text-slate-800 font-medium mt-1">
                              {formatCurrency(contract.deposit_amount)}
                              <Badge className="ml-2 bg-slate-100 text-slate-600">
                                {contract.deposit_paid ? 'Pagado' : 'Pendiente'}
                              </Badge>
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link href={`/payments/new?contract=${contract.id}`}>
                          <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Registrar Pago
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Terminate Contract Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="destructive"
                      onClick={() => setTerminateDialogOpen(true)}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Terminar Contrato
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <User className="h-16 w-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Sin Contrato Activo</h3>
                    <p className="text-slate-500 text-center mb-4">
                      Este departamento está disponible para rentar
                    </p>
                    <Link href={`/contracts/new?apartment=${apartment.id}`}>
                      <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
                        <FileText className="h-4 w-4 mr-2" />
                        Crear Nuevo Contrato
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-800">Historial de Pagos</CardTitle>
                  <CardDescription className="text-slate-500">
                    Todos los pagos registrados para este departamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No hay pagos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              payment.status === 'paid' ? 'bg-emerald-50' :
                              payment.status === 'pending' ? 'bg-yellow-50' :
                              'bg-red-50'
                            }`}>
                              <CreditCard className={`h-4 w-4 ${
                                payment.status === 'paid' ? 'text-emerald-600' :
                                payment.status === 'pending' ? 'text-yellow-600' :
                                'text-red-500'
                              }`} />
                            </div>
                            <div>
                              <p className="text-slate-800 font-medium">
                                {format(new Date(payment.due_date), 'MMMM yyyy', { locale: es })}
                              </p>
                              <p className="text-slate-500 text-sm">
                                Vence: {format(new Date(payment.due_date), 'dd MMM', { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-800 font-semibold">{formatCurrency(payment.amount)}</p>
                            <Badge className={getPaymentStatusColor(payment.status)}>
                              {payment.status === 'paid' ? 'Pagado' :
                               payment.status === 'pending' ? 'Pendiente' : 'Vencido'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-red-500" />
                    Gastos del Departamento
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Total: ${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay gastos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-md ${
                              expense.category === 'maintenance' ? 'bg-blue-100 text-blue-600' :
                              expense.category === 'utilities' ? 'bg-yellow-100 text-yellow-600' :
                              expense.category === 'repairs' ? 'bg-orange-100 text-orange-600' :
                              expense.category === 'insurance' ? 'bg-purple-100 text-purple-600' :
                              expense.category === 'taxes' ? 'bg-red-100 text-red-600' :
                              expense.category === 'management' ? 'bg-cyan-100 text-cyan-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {expense.category === 'maintenance' ? <Wrench className="h-4 w-4" /> :
                               expense.category === 'utilities' ? <Zap className="h-4 w-4" /> :
                               expense.category === 'repairs' ? <Hammer className="h-4 w-4" /> :
                               expense.category === 'insurance' ? <Shield className="h-4 w-4" /> :
                               expense.category === 'taxes' ? <FileText className="h-4 w-4" /> :
                               expense.category === 'management' ? <Briefcase className="h-4 w-4" /> :
                               <MoreHorizontal className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{expense.description}</p>
                              <p className="text-xs text-slate-500">
                                {format(new Date(expense.expense_date), 'dd MMM yyyy', { locale: es })}
                                {expense.notes && ` · ${expense.notes}`}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            ${Number(expense.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Terminate Contract Dialog */}
      <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Terminar Contrato
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Estás a punto de finalizar el contrato con {contract?.tenant?.first_name} {contract?.tenant?.last_name}. Esta acción liberará el departamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Fecha de Terminación *</Label>
              <Input
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="bg-white border-slate-300"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Motivo de Terminación *</Label>
              <Select value={terminationReason} onValueChange={setTerminationReason}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="voluntary_tenant">Deseo del inquilino</SelectItem>
                  <SelectItem value="voluntary_landlord">Deseo del propietario</SelectItem>
                  <SelectItem value="non_payment">Incumplimiento de pago</SelectItem>
                  <SelectItem value="contract_breach">Incumplimiento de contrato</SelectItem>
                  <SelectItem value="property_sale">Venta de propiedad</SelectItem>
                  <SelectItem value="renovation">Renovación del inmueble</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Notas adicionales</Label>
              <Textarea
                value={terminationNotes}
                onChange={(e) => setTerminationNotes(e.target.value)}
                placeholder="Detalles adicionales sobre la terminación..."
                className="bg-white border-slate-300"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTerminateDialogOpen(false)}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminateContract}
              disabled={!terminationReason || terminating}
            >
              {terminating ? 'Terminando...' : 'Confirmar Terminación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
