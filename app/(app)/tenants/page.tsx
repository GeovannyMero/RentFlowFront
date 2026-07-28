'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tenant, TenantInsert } from '@/types/database';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  Mail,
  AlertCircle,
  MoreVertical,
  User,
  Building2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<(Tenant & { apartment_name?: string; apartment_id?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<TenantInsert>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    identification_number: '',
    notes: '',
    user_id: '',
  });

  useEffect(() => {
    if (user) {
      loadTenants();
    }
  }, [user]);

  const loadTenants = async () => {
    setLoading(true);
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    // Get active contracts for each tenant
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, tenant_id, apartment_id, apartments(name, number, id)')
      .eq('user_id', user!.id)
      .eq('status', 'active');

    const tenantsWithApartments = tenantsData?.map((tenant) => {
      const contract = contracts?.find((c) => c.tenant_id === tenant.id);
      return {
        ...tenant,
        apartment_name: contract?.apartments
          ? `${(contract.apartments as any).name} (Depto. ${(contract.apartments as any).number})`
          : undefined,
        apartment_id: contract?.apartment_id,
      };
    }) || [];

    setTenants(tenantsWithApartments);
    setLoading(false);
  };

  const handleOpenDialog = (tenant?: Tenant) => {
    if (tenant) {
      setSelectedTenant(tenant);
      setFormData({
        first_name: tenant.first_name,
        last_name: tenant.last_name,
        email: tenant.email || '',
        phone: tenant.phone || '',
        emergency_contact: tenant.emergency_contact || '',
        emergency_phone: tenant.emergency_phone || '',
        identification_number: tenant.identification_number || '',
        notes: tenant.notes || '',
        user_id: user!.id,
      });
    } else {
      setSelectedTenant(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        emergency_contact: '',
        emergency_phone: '',
        identification_number: '',
        notes: '',
        user_id: user!.id,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      return;
    }

    if (selectedTenant) {
      const { error } = await supabase
        .from('tenants')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          emergency_contact: formData.emergency_contact || null,
          emergency_phone: formData.emergency_phone || null,
          identification_number: formData.identification_number || null,
          notes: formData.notes || null,
        })
        .eq('id', selectedTenant.id);

      if (!error) {
        loadTenants();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from('tenants').insert([formData]);

      if (!error) {
        loadTenants();
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedTenant) {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', selectedTenant.id);

      if (!error) {
        loadTenants();
        setDeleteDialogOpen(false);
        setSelectedTenant(null);
      }
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone?.includes(searchQuery);
    return matchesSearch;
  });

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
          <h1 className="text-3xl font-bold text-slate-800">Inquilinos</h1>
          <p className="text-slate-500">Administra los inquilinos de tus propiedades</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-emerald-500 to-teal-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Inquilino
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No hay inquilinos</h3>
            <p className="text-slate-500 text-center mb-4">
              Comienza agregando tu primer inquilino
            </p>
            <Button onClick={() => handleOpenDialog()} variant="outline" className="border-emerald-500 text-emerald-400">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Inquilino
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-800 text-lg">
                        {tenant.first_name} {tenant.last_name}
                      </CardTitle>
                      {tenant.apartment_name && (
                        <div className="flex items-center gap-1 text-sm text-emerald-600 mt-1">
                          <Building2 className="h-3 w-3" />
                          {tenant.apartment_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-800">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white border-slate-200 shadow-lg">
                      <DropdownMenuItem
                        onClick={() => handleOpenDialog(tenant)}
                        className="text-slate-700 hover:bg-slate-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTenant(tenant);
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
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenant.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${tenant.email}`} className="text-sm text-slate-600 hover:text-slate-900">
                        {tenant.email}
                      </a>
                    </div>
                  )}
                  {tenant.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${tenant.phone}`} className="text-sm text-slate-600 hover:text-slate-900">
                        {tenant.phone}
                      </a>
                    </div>
                  )}
                  {tenant.identification_number && (
                    <div className="text-sm text-slate-500">
                      ID: {tenant.identification_number}
                    </div>
                  )}
                  <div className="pt-3 flex gap-2">
                    {tenant.apartment_id ? (
                      <Link href={`/apartments/${tenant.apartment_id}`} className="flex-1">
                        <Button variant="outline" className="w-full border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                          Ver Departamento
                        </Button>
                      </Link>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500">Sin contrato activo</Badge>
                    )}
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
            <DialogTitle>{selectedTenant ? 'Editar Inquilino' : 'Nuevo Inquilino'}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {selectedTenant
                ? 'Actualiza la información del inquilino'
                : 'Completa los datos del nuevo inquilino'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Nombre *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Apellidos *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Teléfono</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-white border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Contacto de Emergencia</Label>
                <Input
                  value={formData.emergency_contact || ''}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Teléfono Emergencia</Label>
                <Input
                  value={formData.emergency_phone || ''}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Número de Identificación</Label>
              <Input
                value={formData.identification_number || ''}
                onChange={(e) => setFormData({ ...formData, identification_number: e.target.value })}
                className="bg-white border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white border-slate-300"
                rows={3}
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
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {selectedTenant ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              ¿Estás seguro de eliminar al inquilino "{selectedTenant?.first_name} {selectedTenant?.last_name}"? Esta acción no se puede deshacer.
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
