import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  History,
  Home,
  LineChart,
  School,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { UserRole } from "@/types";

type AllowedRole = UserRole;

const isAllowedForRole = (itemRoles: AllowedRole[] | undefined, role: UserRole | undefined) => {
  if (!itemRoles || itemRoles.length === 0) {
    return true;
  }
  if (!role) {
    return false;
  }
  return itemRoles.includes(role);
};

export interface SidebarNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles?: AllowedRole[];
}

export interface SearchNavItem {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  group: "Páginas" | "Ações rápidas";
  keywords: string[];
  roles?: AllowedRole[];
}

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: LineChart, label: "Analytics", path: "/analytics" },
  { icon: AlertTriangle, label: "Acompanhamentos", path: "/acompanhamentos" },
  { icon: School, label: "Turmas", path: "/turmas", roles: ["admin"] },
  { icon: Users, label: "Alunos", path: "/alunos", roles: ["admin"] },
  { icon: BookOpen, label: "Notas", path: "/notas-frequencia", roles: ["admin"] },
  { icon: History, label: "Trajetória", path: "/trajetoria" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios-integrados" },
  { icon: GraduationCap, label: "Slides", path: "/slides" },
  { icon: FileText, label: "Certificados", path: "/certificados" },
];

const SEARCH_NAV_ITEMS: SearchNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Visão geral da escola",
    path: "/",
    icon: Home,
    group: "Páginas",
    keywords: ["inicio", "painel", "resumo", "home"],
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Indicadores e tendências da escola",
    path: "/analytics",
    icon: LineChart,
    group: "Páginas",
    keywords: ["analise", "graficos", "dados", "tendencia"],
  },
  {
    id: "incidents",
    label: "Acompanhamentos",
    description: "Registros disciplinares e familiares",
    path: "/acompanhamentos",
    icon: AlertTriangle,
    group: "Páginas",
    keywords: ["ocorrencia", "convivencia", "incidente", "comportamento"],
  },
  {
    id: "classes",
    label: "Turmas",
    description: "Gerenciar turmas e templates",
    path: "/turmas",
    icon: School,
    group: "Páginas",
    keywords: ["classe", "serie", "curso", "diretor"],
    roles: ["admin"],
  },
  {
    id: "students",
    label: "Alunos",
    description: "Cadastro e gestão de estudantes",
    path: "/alunos",
    icon: Users,
    group: "Páginas",
    keywords: ["estudante", "cadastro", "matricula"],
    roles: ["admin"],
  },
  {
    id: "grades",
    label: "Notas",
    description: "Lançamento de notas por turma",
    path: "/notas-frequencia",
    icon: BookOpen,
    group: "Páginas",
    keywords: ["boletim", "frequencia", "avaliacao"],
    roles: ["admin"],
  },
  {
    id: "trajectory",
    label: "Trajetória",
    description: "Histórico longitudinal do aluno",
    path: "/trajetoria",
    icon: History,
    group: "Páginas",
    keywords: ["historico", "evolucao", "timeline"],
  },
  {
    id: "integrated-reports",
    label: "Relatórios",
    description: "Relatórios integrados por turma e aluno",
    path: "/relatorios-integrados",
    icon: BarChart3,
    group: "Páginas",
    keywords: ["pdf", "relatorio", "documento"],
  },
  {
    id: "slides",
    label: "Slides",
    description: "Apresentações automáticas de acompanhamento",
    path: "/slides",
    icon: GraduationCap,
    group: "Páginas",
    keywords: ["apresentacao", "slide", "aula"],
  },
  {
    id: "certificates",
    label: "Certificados",
    description: "Emissão e edição de certificados",
    path: "/certificados",
    icon: FileText,
    group: "Páginas",
    keywords: ["certificado", "monitoria", "evento", "destaque"],
  },
  {
    id: "users",
    label: "Usuários",
    description: "Gestão de contas e permissões",
    path: "/usuarios",
    icon: Shield,
    group: "Páginas",
    keywords: ["acesso", "perfil", "conta", "admin"],
    roles: ["admin"],
  },
  {
    id: "new-incident",
    label: "Nova ocorrência",
    description: "Abrir módulo para registrar nova ocorrência",
    path: "/acompanhamentos?action=nova-ocorrencia&tipo=disciplinar",
    icon: AlertTriangle,
    group: "Ações rápidas",
    keywords: ["registrar", "nova", "disciplinar", "familia", "popup", "dialog"],
  },
  {
    id: "new-family-followup",
    label: "Novo acompanhamento familiar",
    description: "Abrir cadastro de acompanhamento familiar",
    path: "/acompanhamentos?action=nova-ocorrencia&tipo=acompanhamento_familiar",
    icon: AlertTriangle,
    group: "Ações rápidas",
    keywords: ["familia", "familiar", "responsavel", "conversa", "popup", "dialog"],
  },
  {
    id: "issue-certificates",
    label: "Emitir certificado",
    description: "Abrir emissão de certificados diretamente",
    path: "/certificados?action=emitir",
    icon: FileText,
    group: "Ações rápidas",
    keywords: ["emitir", "download", "pdf", "zip", "popup", "dialog", "novo certificado"],
  },
  {
    id: "create-slide",
    label: "Gerar slides",
    description: "Abrir módulo de slides de apresentação",
    path: "/slides",
    icon: GraduationCap,
    group: "Ações rápidas",
    keywords: ["gerar", "apresentacao", "exportar"],
  },
  {
    id: "register-student",
    label: "Cadastrar aluno",
    description: "Abrir a gestão de alunos",
    path: "/alunos",
    icon: UserPlus,
    group: "Ações rápidas",
    keywords: ["novo aluno", "matricula", "cadastro"],
    roles: ["admin"],
  },
  {
    id: "manage-classes",
    label: "Gerenciar turmas",
    description: "Abrir gestão de turmas",
    path: "/turmas",
    icon: School,
    group: "Ações rápidas",
    keywords: ["classe", "diretor", "configurar turma"],
    roles: ["admin"],
  },
];

export const getSidebarNavItems = (role: UserRole | undefined): SidebarNavItem[] =>
  SIDEBAR_NAV_ITEMS.filter((item) => isAllowedForRole(item.roles, role));

export const getSearchNavItems = (role: UserRole | undefined): SearchNavItem[] =>
  SEARCH_NAV_ITEMS.filter((item) => isAllowedForRole(item.roles, role));
