import { UsersManage } from '@/components/users/UsersManage';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Users = () => {
    const { isAdmin, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Carregando...</p>
            </div>
        );
    }

    // Redirect non-admin users
    if (!isAdmin()) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <UsersManage />
        </div>
    );
};

export default Users;
