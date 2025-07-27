from rest_framework import permissions
from .models import UserProfile

class RoleBasedPermission(permissions.BasePermission):
    """
    Custom permission to check role-based access.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        try:
            profile = request.user.profile
            if not profile.is_active:
                return False
                
            # Super admin has all permissions
            if request.user.is_superuser:
                return True
                
            # Check specific permissions based on view action
            action = getattr(view, 'action', None)
            model_name = getattr(view, 'queryset', None)
            
            if model_name:
                model_name = model_name.model.__name__.lower()
                
            return self.check_permission(profile, action, model_name)
            
        except UserProfile.DoesNotExist:
            return False
        
    def check_permission(self, profile, action, model_name):
        permissions = profile.permissions
        
        # Define permission mappings
        permission_key = f"{model_name}_{action}"
        
        return permissions.get(permission_key, False)
    
class CompanyDataPermission(permissions.BasePermission):
    """
    Permission to ensure users can only access their company's data
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
            
        profile = request.user.profile
        
        # Talent Verify admins can access all data
        if profile.role and profile.role.name == 'talent_verify_admin':
            return True
            
        # Company users can only access their company's data
        if hasattr(obj, 'company'):
            return profile.company == obj.company
        elif hasattr(obj, 'employee') and hasattr(obj.employee, 'company'):
            return profile.company == obj.employee.company
            
        return False