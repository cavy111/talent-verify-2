# backend/talent_verify/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from authentication.views import SecureTokenObtainPairView, logout_view, user_profile_view, user_permissions_view, UserManagementViewSet
from companies.views import CompanyViewSet
from employees.views import EmployeeViewSet
from bulk_operations.views import BulkUploadViewSet
from audit.views import AuditLogViewSet, SecurityEventViewSet
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'employees', EmployeeViewSet, basename='employees')
router.register(r'bulk-upload', BulkUploadViewSet, basename='bulk-upload')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'security-events', SecurityEventViewSet, basename='securityevent')
router.register(r'users', UserManagementViewSet, basename='users')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/login/', SecureTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/profile/', user_profile_view, name='user_profile'),
    path('api/auth/permissions/', user_permissions_view, name='user_permissions'),
]