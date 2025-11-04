import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { storage } from '@/lib/localStorage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Prof. João Silva',
    email: 'professor@escola.com',
    role: 'professor',
    assignedClasses: ['1', '2'],
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'diretor@escola.com',
    role: 'diretor',
    assignedClasses: ['1', '2', '3'],
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'coordenador@escola.com',
    role: 'coordenador',
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'secretaria@escola.com',
    role: 'secretaria',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = storage.get<User>('AUTH_USER');
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock authentication - in production, this would call an API
    const foundUser = MOCK_USERS.find(u => u.email === email);
    
    if (!foundUser) {
      throw new Error('Usuário não encontrado');
    }

    // For demo: any password works (in production, validate properly)
    setUser(foundUser);
    storage.set('AUTH_USER', foundUser);
  };

  const logout = () => {
    setUser(null);
    storage.remove('AUTH_USER');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
