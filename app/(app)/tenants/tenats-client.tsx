'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tenant } from '@/types/database';
import {
    AlertCircle,
    Building2,
    Edit,
    Mail,
    MoreVertical,
    Phone,
    Plus,
    Search,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteTenant, saveTenant, TenantFormData } from './actions';

export type TenantWithApartment = Tenant & { apartment_name?: string; apartment_id?: string };

const emptyForm: TenantFormData = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    identification_number: '',
    notes: '',
};

export default function TenantsClient({ tenants }: { tenants: TenantWithApartment[] }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState<TenantFormData>(emptyForm);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleOpenDialog = (tenant?: Tenant) => {
        setError(null);
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
            });
        } else {
            setSelectedTenant(null);
            setFormData(emptyForm);
        }
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('El nombre y los apellidos son obligatorios');
            return;
        }

        startTransition(async () => {
            const result = await saveTenant(selectedTenant?.id ?? null, formData);
            if (result.error) {
                setError(result.error);
                return;
            }
            setDialogOpen(false);
        });
    };

    const handleDelete = () => {
        if (!selectedTenant) return;

        startTransition(async () => {
            const result = await deleteTenant(selectedTenant.id);
            if (result.error) {
                setError(result.error);
                return;
            }
            setDeleteDialogOpen(false);
            setSelectedTenant(null);
        });
    };

    const filteredTenants = tenants.filter((tenant) => {
        const matchesSearch =
            tenant.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.phone?.includes(searchQuery);
        return matchesSearch;
    });

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
                                                    setError(null);
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
                    {error && (
                        <p className="flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDialogOpen(false)}
                            disabled={isPending}
                            className="text-slate-500 hover:text-slate-900"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isPending}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600"
                        >
                            {isPending ? 'Guardando...' : selectedTenant ? 'Actualizar' : 'Crear'}
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
                    {error && (
                        <p className="flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isPending}
                            className="text-slate-500 hover:text-slate-900"
                        >
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
