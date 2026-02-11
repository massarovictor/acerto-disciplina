import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';
import { Search, Plus, Edit, Trash2, AlertTriangle, Shield, User, GraduationCap, Loader2 } from 'lucide-react';
import type { UserRole } from '@/types';

interface AuthorizedEmail {
    email: string;
    role: UserRole;
    created_at: string;
}

const roleOptions: Array<{ value: UserRole; label: string }> = [
    { value: 'professor', label: 'Professor' },
    { value: 'diretor', label: 'Diretor de Turma' },
    { value: 'admin', label: 'Administrador' },
];

export const UsersManage = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<AuthorizedEmail[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AuthorizedEmail | null>(null);
    const [deletingUser, setDeletingUser] = useState<AuthorizedEmail | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    const [formData, setFormData] = useState<{ email: string; role: UserRole }>({ email: '', role: 'professor' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('authorized_emails')
            .select('*')
            .order('email');

        if (error) {
            console.error('Error fetching users:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar os usuários.',
                variant: 'destructive',
            });
        } else {
            setUsers(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(
        (user) =>
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddUser = async () => {
        if (!formData.email.trim()) {
            toast({
                title: 'Erro',
                description: 'Digite o email do usuário.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        const normalizedEmail = formData.email.toLowerCase().trim();

        const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
                email: normalizedEmail,
                role: formData.role,
            },
        });

        if (error) {
            toast({
                title: 'Erro',
                description: error.message || 'Não foi possível adicionar o usuário.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        if (data?.warning) {
            toast({
                title: 'Aviso',
                description: data.warning,
            });
        } else {
            toast({
                title: 'Sucesso',
                description: 'Usuário adicionado e criado no sistema.',
            });
        }

        setIsAddDialogOpen(false);
        setFormData({ email: '', role: 'professor' });
        setSearchTerm(''); // Clear search to ensure new user is visible
        await fetchUsers(); // Await to ensure list is updated before unlocking
        setIsSubmitting(false);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        setIsSubmitting(true);

        const { error } = await supabase.functions.invoke('create-user', {
            method: 'PUT',
            body: {
                email: editingUser.email,
                role: formData.role
            },
        });

        if (error) {
            toast({
                title: 'Erro',
                description: error.message || 'Não foi possível atualizar o usuário.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        toast({
            title: 'Sucesso',
            description: 'Usuário atualizado com sucesso.',
        });
        setEditingUser(null);
        await fetchUsers();
        setIsSubmitting(false);
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;

        setIsSubmitting(true);
        const { error } = await supabase.functions.invoke('create-user', {
            method: 'DELETE',
            body: { email: deletingUser.email },
        });

        if (error) {
            toast({
                title: 'Erro',
                description: error.message || 'Não foi possível remover o usuário.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        toast({
            title: 'Sucesso',
            description: 'Usuário removido do sistema (login e email autorizado).',
        });
        toast({
            title: 'Sucesso',
            description: 'Usuário removido do sistema (login e email autorizado).',
        });
        setDeletingUser(null);
        setDeleteConfirmationText('');
        await fetchUsers();
        await fetchUsers();
        setIsSubmitting(false);
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return (
                    <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                    </Badge>
                );
            case 'diretor':
                return (
                    <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Diretor
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-muted">
                        <User className="h-3 w-3 mr-1" />
                        Professor
                    </Badge>
                );
        }
    };

    const adminCount = users.filter((u) => u.role === 'admin').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                    <p className="text-muted-foreground">
                        Adicione, edite ou remova usuários autorizados no sistema.
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Usuário
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Usuários Autorizados ({users.length})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por email ou papel..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Carregando...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum usuário encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Papel</TableHead>
                                    <TableHead>Cadastrado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.email}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setFormData({ email: user.email, role: user.role });
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeletingUser(user)}
                                                    disabled={user.role === 'admin' && adminCount <= 1}
                                                    title={
                                                        user.role === 'admin' && adminCount <= 1
                                                            ? 'Não é possível remover o último admin'
                                                            : 'Remover usuário'
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add User Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Usuário</DialogTitle>
                        <DialogDescription>
                            Informe o email e o papel do usuário autorizado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="usuario@escola.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Papel</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, role: value as UserRole })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((roleOption) => (
                                        <SelectItem key={roleOption.value} value={roleOption.value}>
                                            {roleOption.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddUser} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adicionando...
                                </>
                            ) : (
                                'Adicionar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Atualize o papel do usuário selecionado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={editingUser?.email || ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Papel</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, role: value as UserRole })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((roleOption) => (
                                        <SelectItem key={roleOption.value} value={roleOption.value}>
                                            {roleOption.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateUser} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <div className="space-y-2">
                                <p>
                                    Tem certeza que deseja remover <strong>{deletingUser?.email}</strong> da lista de usuários autorizados?
                                </p>
                                <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md text-sm text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/30">
                                    <p className="font-semibold mb-1 flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4" />
                                        Atenção:
                                    </p>
                                    <p>
                                        Este usuário perderá o acesso ao sistema imediatamente.
                                    </p>
                                </div>
                                <p className="text-sm font-medium pt-2">
                                    Digite <span className="font-bold text-red-600">excluir</span> para confirmar:
                                </p>
                                <Input
                                    value={deleteConfirmationText}
                                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                    placeholder="excluir"
                                    className="border-red-200 focus-visible:ring-red-500"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault(); // Prevent auto-close
                                handleDeleteUser();
                            }}
                            disabled={isSubmitting || deleteConfirmationText.toLowerCase() !== 'excluir'}
                            className="bg-destructive hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                'Remover'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
