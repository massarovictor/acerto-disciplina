import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Class, Incident, User, UserRole } from "@/types";

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase();

const resolveRoleFromMetadata = (user: SupabaseUser | null): UserRole | undefined => {
  const metadataRole =
    typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : undefined;

  if (metadataRole === "admin" || metadataRole === "diretor" || metadataRole === "professor") {
    return metadataRole;
  }

  return undefined;
};

export const resolveUserRole = ({
  profile,
  user,
}: {
  profile: User | null;
  user: SupabaseUser | null;
}): UserRole | undefined => {
  if (profile?.role === "admin" || profile?.role === "diretor" || profile?.role === "professor") {
    return profile.role;
  }

  return resolveRoleFromMetadata(user);
};

const isDirectorResponsibleForClass = ({
  schoolClass,
  user,
  profile,
}: {
  schoolClass: Class;
  user: SupabaseUser | null;
  profile: User | null;
}) => {
  const normalizedClassDirectorEmail = normalizeEmail(schoolClass.directorEmail);
  const normalizedUserEmail = normalizeEmail(user?.email);
  const normalizedProfileEmail = normalizeEmail(profile?.email);

  const isDirectorByEmail =
    normalizedClassDirectorEmail !== "" &&
    (normalizedClassDirectorEmail === normalizedUserEmail ||
      (normalizedProfileEmail !== "" && normalizedClassDirectorEmail === normalizedProfileEmail));

  const isDirectorById = !!schoolClass.directorId && !!user?.id && schoolClass.directorId === user.id;

  return isDirectorByEmail || isDirectorById;
};

export interface DashboardRoleScope {
  role: UserRole | undefined;
  canViewRecentActivity: boolean;
  isAdmin: boolean;
  allowedClassIds: string[];
}

export const getDashboardRoleScope = ({
  profile,
  user,
  classes,
}: {
  profile: User | null;
  user: SupabaseUser | null;
  classes: Class[];
}): DashboardRoleScope => {
  const role = resolveUserRole({ profile, user });
  const isAdmin = role === "admin";

  if (isAdmin) {
    return {
      role,
      canViewRecentActivity: true,
      isAdmin: true,
      allowedClassIds: classes.map((schoolClass) => schoolClass.id),
    };
  }

  if (role === "diretor") {
    const directorClassIds = classes
      .filter((schoolClass) => isDirectorResponsibleForClass({ schoolClass, user, profile }))
      .map((schoolClass) => schoolClass.id);

    return {
      role,
      canViewRecentActivity: true,
      isAdmin: false,
      allowedClassIds: directorClassIds,
    };
  }

  return {
    role,
    canViewRecentActivity: false,
    isAdmin: false,
    allowedClassIds: [],
  };
};

export const filterIncidentsByDashboardScope = (
  incidents: Incident[],
  scope: DashboardRoleScope,
): Incident[] => {
  if (scope.isAdmin) {
    return incidents;
  }

  if (scope.role === "diretor") {
    const allowedClassIds = new Set(scope.allowedClassIds);
    return incidents.filter((incident) => allowedClassIds.has(incident.classId));
  }

  return [];
};
