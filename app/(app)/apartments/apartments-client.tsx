'use client';

export const instant = false;

import { useAuth } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { GetAppartment } from '@/services/apartmetService';
import { GetContract } from '@/services/contractService';
import { Apartment, ApartmentInsert } from '@/types/database';
import {
    AlertCircle,
    Bath,
    Bed,
    Building2,
    Edit,
    Filter,
    Maximize,
    MoreVertical,
    Plus,
    Search,
    Trash2,
    User,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { deleteApartment, saveApartment } from './actions';


export default function ApartmentsClient() {
    const { user } = useAuth();
    const [apartments, setApartments] = useState<(Apartment & { tenant_name?: string; contract_id?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState<ApartmentInsert>({
        number: '',
        name: '',
        description: '',
        monthly_rent: 0,
        status: 'vacant',
        bedrooms: 1,
        bathrooms: 1,
        area: null,
        floor: null,
        user_id: '',
    });

    useEffect(() => {
        if (user) {
            loadApartments();
        }
    }, [user]);

    const loadApartments = async () => {
        setLoading(true);
        // const { data: apartmentsData } = await supabase
        //     .from('apartments')
        //     .select('*')
        //     .eq('user_id', user!.id)
        //     .order('number');
        const apartmentsData = await GetAppartment(user!.id);

        // Get active contracts for each apartment
        // const { data: contracts } = await supabase
        //     .from('contracts')
        //     .select('id, apartment_id, tenant_id, tenants(first_name, last_name)')
        //     .eq('user_id', user!.id)
        //     .eq('status', 'active');
        const contracts = await GetContract(user!.id);

        const apartmentsWithTenants = apartmentsData?.map((apt) => {
            const contract = contracts?.find((c) => c.apartment_id === apt.id);
            return {
                ...apt,
                tenant_name: contract?.tenants
                    ? `${(contract.tenants as any).first_name} ${(contract.tenants as any).last_name}`
                    : undefined,
                contract_id: contract?.id,
            };
        }) || [];

        setApartments(apartmentsWithTenants);
        setLoading(false);
    };

    const handleOpenDialog = (apartment?: Apartment) => {
        if (apartment) {
            setSelectedApartment(apartment);
            setFormData({
                number: apartment.number,
                name: apartment.name,
                description: apartment.description || '',
                monthly_rent: apartment.monthly_rent,
                status: apartment.status,
                bedrooms: apartment.bedrooms,
                bathrooms: apartment.bathrooms,
                area: apartment.area,
                floor: apartment.floor,
                user_id: user!.id,
            });
        } else {
            setSelectedApartment(null);
            setFormData({
                number: '',
                name: '',
                description: '',
                monthly_rent: 0,
                status: 'vacant',
                bedrooms: 1,
                bathrooms: 1,
                area: null,
                floor: null,
                user_id: user!.id,
            });
        }
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.number || !formData.name || formData.monthly_rent <= 0) {
            return;
        }

        startTransition(async () => {
            const result = await saveApartment(selectedApartment?.id ?? null, {
                number: formData.number,
                name: formData.name,
                description: formData.description,
                monthly_rent: formData.monthly_rent,
                status: formData.status ?? 'vacant',
                bedrooms: formData.bedrooms ?? 1,
                bathrooms: formData.bathrooms ?? 1,
                area: formData.area,
                floor: formData.floor,
            });

            if (!result.error) {
                loadApartments();
                setDialogOpen(false);
            }
        });
    };

    const handleDelete = () => {
        if (!selectedApartment) return;

        startTransition(async () => {
            const result = await deleteApartment(selectedApartment.id);

            if (!result.error) {
                loadApartments();
                setDeleteDialogOpen(false);
                setSelectedApartment(null);
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'occupied':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'vacant':
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            case 'maintenance':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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

    const filteredApartments = apartments.filter((apt) => {
        const matchesSearch =
            apt.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            apt.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        return matchesSearch && matchesStatus;
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
                    <h1 className="text-3xl font-bold text-slate-800">Departamentos</h1>
                    <p className="text-slate-500">Gestiona tu inventario de propiedades</p>
                </div>
                <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Departamento
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por número o nombre..."
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
                        <SelectItem value="occupied">Ocupados</SelectItem>
                        <SelectItem value="vacant">Vacíos</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Apartments Grid */}
            {filteredApartments.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Building2 className="h-16 w-16 text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No hay departamentos</h3>
                        <p className="text-slate-500 text-center mb-4">
                            Comienza agregando tu primer departamento al sistema
                        </p>
                        <Button onClick={() => handleOpenDialog()} variant="outline" className="border-emerald-500 text-emerald-400">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Departamento
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredApartments.map((apartment) => (
                        <Card
                            key={apartment.id}
                            className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                            <Building2 className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-slate-800 text-lg">{apartment.name}</CardTitle>
                                            <CardDescription className="text-slate-500 text-sm">Depto. {apartment.number}</CardDescription>
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
                                                onClick={() => handleOpenDialog(apartment)}
                                                className="text-slate-700 hover:bg-slate-50"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedApartment(apartment);
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
                                <div className="space-y-4">
                                    {/* Status and Rent */}
                                    <div className="flex items-center justify-between">
                                        <Badge className={getStatusColor(apartment.status)}>
                                            {getStatusLabel(apartment.status)}
                                        </Badge>
                                        <span className="text-xl font-bold text-slate-800">
                                            {formatCurrency(apartment.monthly_rent)}
                                            <span className="text-sm text-slate-500 font-normal">/mes</span>
                                        </span>
                                    </div>

                                    {/* Features */}
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Bed className="h-4 w-4" />
                                            {apartment.bedrooms}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Bath className="h-4 w-4" />
                                            {apartment.bathrooms}
                                        </div>
                                        {apartment.area && (
                                            <div className="flex items-center gap-1">
                                                <Maximize className="h-4 w-4" />
                                                {apartment.area} m²
                                            </div>
                                        )}
                                        {apartment.floor && (
                                            <div className="text-slate-400">Piso {apartment.floor}</div>
                                        )}
                                    </div>

                                    {/* Tenant */}
                                    {apartment.tenant_name && (
                                        <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                                            <User className="h-4 w-4 text-emerald-600" />
                                            <span className="text-sm text-slate-700">{apartment.tenant_name}</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <Link href={`/apartments/${apartment.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                                                Ver Detalles
                                            </Button>
                                        </Link>
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
                        <DialogTitle>{selectedApartment ? 'Editar Departamento' : 'Nuevo Departamento'}</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {selectedApartment
                                ? 'Actualiza la información del departamento'
                                : 'Completa los datos del nuevo departamento'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700">Número *</Label>
                                <Input
                                    value={formData.number}
                                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
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
                                        <SelectItem value="vacant">Vacío</SelectItem>
                                        <SelectItem value="occupied">Ocupado</SelectItem>
                                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Nombre *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-white border-slate-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Renta Mensual *</Label>
                            <Input
                                type="number"
                                value={formData.monthly_rent}
                                onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })}
                                className="bg-white border-slate-300"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700">Recámaras</Label>
                                <Input
                                    type="number"
                                    value={formData.bedrooms}
                                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                                    className="bg-white border-slate-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700">Baños</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.bathrooms}
                                    onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                                    className="bg-white border-slate-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700">Piso</Label>
                                <Input
                                    type="number"
                                    value={formData.floor || ''}
                                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || null })}
                                    className="bg-white border-slate-300"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Área (m²)</Label>
                            <Input
                                type="number"
                                value={formData.area || ''}
                                onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) || null })}
                                className="bg-white border-slate-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Descripción</Label>
                            <Textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                            disabled={isPending}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600"
                        >
                            {isPending ? 'Guardando...' : selectedApartment ? 'Actualizar' : 'Crear'}
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
                            ¿Estás seguro de eliminar el departamento "{selectedApartment?.name}"? Esta acción no se puede deshacer.
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
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
