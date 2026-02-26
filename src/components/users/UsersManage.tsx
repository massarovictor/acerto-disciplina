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
    display_name?: string | null;
    created_at: string;
}

const USER_SESSION_ERROR =
    'Sessao expirada ou invalida. Faca logout e login novamente.';

const ensureFreshAccessToken = async (): Promise<{ token?: string; error?: string }> => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        return { error: USER_SESSION_ERROR };
    }

    let session = sessionData.session;
    if (!session?.access_token) {
        return { error: 'Usuario nao autenticado. Faca login para continuar.' };
    }

    const expiresAtMs = (session.expires_at || 0) * 1000;
    if (!expiresAtMs || expiresAtMs <= Date.now() + 60_000) {
        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedData.session?.access_token) {
            return { error: USER_SESSION_ERROR };
        }
        session = refreshedData.session;
    }

    const validateToken = async (token: string): Promise<boolean> => {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        return !userError && Boolean(userData.user);
    };

    let accessToken = session.access_token;
    if (!(await validateToken(accessToken))) {
        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedData.session?.access_token) {
            return { error: USER_SESSION_ERROR };
        }
        accessToken = refreshedData.session.access_token;
        if (!(await validateToken(accessToken))) {
            return { error: USER_SESSION_ERROR };
        }
    }

    return { token: accessToken };
};

const callCreateUserFunction = async (
    method: 'POST' | 'PUT' | 'DELETE',
    body: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
    const tokenData = await ensureFreshAccessToken();
    if (!tokenData.token) {
        throw new Error(tokenData.error || USER_SESSION_ERROR);
    }
    const accessToken = tokenData.token.trim();
    const effectiveMethod = method;

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
    if (!supabaseUrl || !anonKey) {
        throw new Error('Ambiente Supabase nao configurado no frontend.');
    }

    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/create-user`;
    const execute = async (token: string) =>
        fetch(endpoint, {
            method: effectiveMethod,
            headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: `Bearer ${token.trim()}`,
            },
            body: JSON.stringify(body),
        });

    let response = await execute(accessToken);

    if (response.status === 401) {
        const { data: refreshedData } = await supabase.auth.refreshSession();
        const retryToken = refreshedData.session?.access_token;
        if (!retryToken) {
            throw new Error(USER_SESSION_ERROR);
        }
        response = await execute(retryToken);
    }

    const raw = await response.text().catch(() => '');
    let parsed: Record<string, unknown> = {};
    if (raw) {
        try {
            parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            parsed = { message: raw };
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(USER_SESSION_ERROR);
        }
        const reason = typeof parsed.reason === 'string' ? parsed.reason : '';
        const message =
            (typeof parsed.error === 'string' && parsed.error) ||
            (typeof parsed.message === 'string' && parsed.message) ||
            `Falha HTTP ${response.status} ao executar create-user.`;
        const detailedMessage = reason ? `${message} (${reason})` : message;
        throw new Error(detailedMessage);
    }

    return parsed;
};

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
    const [formData, setFormData] = useState<{ name: string; email: string; role: UserRole }>({
        name: '',
        email: '',
        role: 'professor',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('authorized_emails')
            .select('*')
            .order('email');

        if (error) {
            toast({
                title: 'Erro',
                description: 'Nao foi possivel carregar os usuarios.',
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
            (user.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddUser = async () => {
        if (!formData.name.trim()) {
            toast({
                title: 'Erro',
                description: 'Digite o nome completo do usuario.',
                variant: 'destructive',
            });
            return;
        }

        if (!formData.email.trim()) {
            toast({
                title: 'Erro',
                description: 'Digite o email do usuario.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        const normalizedEmail = formData.email.toLowerCase().trim();

        let data: Record<string, unknown> = {};
        try {
            data = await callCreateUserFunction('POST', {
                name: formData.name.trim(),
                email: normalizedEmail,
                role: formData.role,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Nao foi possivel adicionar o usuario.',
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
                description: 'Usuario adicionado e criado no sistema.',
            });
        }

        setIsAddDialogOpen(false);
        setFormData({ name: '', email: '', role: 'professor' });
        setSearchTerm(''); // Clear search to ensure new user is visible
        await fetchUsers(); // Await to ensure list is updated before unlocking
        setIsSubmitting(false);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        if (!formData.name.trim()) {
            toast({
                title: 'Erro',
                description: 'Digite o nome completo do usuario.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await callCreateUserFunction('PUT', {
                name: formData.name.trim(),
                email: editingUser.email,
                role: formData.role,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Nao foi possivel atualizar o usuario.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        toast({
            title: 'Sucesso',
            description: 'Usuario atualizado com sucesso.',
        });
        setEditingUser(null);
        await fetchUsers();
        setIsSubmitting(false);
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;

        setIsSubmitting(true);
        try {
            await callCreateUserFunction('DELETE', {
                email: deletingUser.email,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Nao foi possivel remover o usuario.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        toast({
            title: 'Sucesso',
            description: 'Usuario removido do sistema (login e email autorizado).',
        });
        setDeletingUser(null);
        setDeleteConfirmationText('');
        await fetchUsers();
        setIsSubmitting(false);
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return (
                    <Badge className="bg-info/10 text-info border-info/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                    </Badge>
                );
            case 'diretor':
                return (
                    <Badge className="bg-info/10 text-info border-info/30">
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
                    <h2 className="text-2xl font-bold">Gerenciar Usuarios</h2>
                    <p className="text-muted-foreground">
                        Adicione, edite ou remova usuarios autorizados no sistema.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setFormData({ name: '', email: '', role: 'professor' });
                        setIsAddDialogOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Usuario
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Usuarios Autorizados ({users.length})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email ou papel..."
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
                            Nenhum usuario encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Papel</TableHead>
                                    <TableHead>Cadastrado em</TableHead>
                                    <TableHead className="text-right">Acoes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.email}>
                                        <TableCell className="font-medium">
                                            {user.display_name?.trim() || 'Sem nome'}
                                        </TableCell>
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
                                                        setFormData({
                                                            name: user.display_name?.trim() || '',
                                                            email: user.email,
                                                            role: user.role,
                                                        });
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
                                                            ? 'Nao e possivel remover o ultimo admin'
                                                            : 'Remover usuario'
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
                        <DialogTitle>Adicionar Usuario</DialogTitle>
                        <DialogDescription>
                            Informe nome completo, email e papel do usuario autorizado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome completo</Label>
                            <Input
                                id="name"
                                placeholder="Nome e sobrenome"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
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
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Atualize nome e papel do usuario selecionado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome completo</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
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
                        <AlertDialogTitle>Confirmar Remocao</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Tem certeza que deseja remover <strong>{deletingUser?.email}</strong> da lista de usuarios autorizados?
                                </p>
                                <div className="bg-destructive/10 dark:bg-destructive/20 p-3 rounded-md text-sm text-destructive dark:text-destructive border border-destructive/30 dark:border-destructive/40">
                                    <p className="font-semibold mb-1 flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4" />
                                        Atencao:
                                    </p>
                                    <p>
                                        Este usuario perdera o acesso ao sistema imediatamente.
                                    </p>
                                </div>
                                <p className="text-sm font-medium pt-2">
                                    Digite <span className="font-bold text-destructive">excluir</span> para confirmar:
                                </p>
                                <Input
                                    value={deleteConfirmationText}
                                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                    placeholder="excluir"
                                    className="border-destructive/30 focus-visible:ring-destructive"
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
