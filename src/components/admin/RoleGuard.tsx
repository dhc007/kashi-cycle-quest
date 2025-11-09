import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppRole = 'admin' | 'manager' | 'viewer';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Authentication Required",
            description: "Please log in to access this page",
            variant: "destructive",
          });
          navigate("/admin/login");
          return;
        }

        // Check if user has any of the allowed roles
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const hasAccess = userRoles?.some(
          (ur) => allowedRoles.includes(ur.role as AppRole)
        );

        if (!hasAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page",
            variant: "destructive",
          });
          navigate("/admin/dashboard");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Role check error:", error);
        toast({
          title: "Error",
          description: "Failed to verify permissions",
          variant: "destructive",
        });
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkRole();
  }, [allowedRoles, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
};

// Hook to check user roles
export const useUserRoles = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRoles([]);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;
        setRoles(data?.map(r => r.role as AppRole) || []);
      } catch (error) {
        console.error("Failed to fetch roles:", error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isViewer = hasRole('viewer');
  const canEdit = isAdmin || isManager;

  return { roles, loading, hasRole, isAdmin, isManager, isViewer, canEdit };
};
