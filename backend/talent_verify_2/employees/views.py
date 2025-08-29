# backend/employees/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Avg
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from datetime import datetime, date
from .models import Employee, EmployeePosition
from .serializers import EmployeeSerializer, EmployeeHistorySerializer, EmployeePositionSerializer
from authentication.permissions import RoleBasedPermission, CompanyDataPermission
from companies.models import Department

class EmployeeFilter(django_filters.FilterSet):
    """Advanced filtering for employees"""
    
    name = django_filters.CharFilter(method='filter_name', label='Name')
    company = django_filters.CharFilter(field_name='company__name', lookup_expr='icontains')
    department = django_filters.CharFilter(method='filter_department')
    role = django_filters.CharFilter(method='filter_role')
    employment_type = django_filters.CharFilter(method='filter_employment_type')
    year_started = django_filters.NumberFilter(method='filter_year_started')
    year_left = django_filters.NumberFilter(method='filter_year_left')
    is_current = django_filters.BooleanFilter(method='filter_is_current')
    experience_years = django_filters.NumberFilter(method='filter_experience_years')
    
    class Meta:
        model = Employee
        fields = [
            'name', 'company', 'department', 'role', 'employment_type',
            'year_started', 'year_left', 'is_current', 'experience_years'
        ]
    
    def filter_name(self, queryset, name, value):
        # Since names are encrypted, we need to decrypt and search
        # This is not efficient for large datasets - consider using searchable hash
        matching_ids = []
        for employee in queryset:
            if value.lower() in employee.name.lower():
                matching_ids.append(employee.id)
        return queryset.filter(id__in=matching_ids)
    
    def filter_department(self, queryset, name, value):
        return queryset.filter(
            positions__department__name__icontains=value
        ).distinct()
    
    def filter_role(self, queryset, name, value):
        return queryset.filter(
            positions__role__icontains=value
        ).distinct()
    
    def filter_employment_type(self, queryset, name, value):
        return queryset.filter(
            positions__employment_type=value,
            positions__is_current=True
        ).distinct()
    
    def filter_year_started(self, queryset, name, value):
        return queryset.filter(
            positions__start_date__year=value
        ).distinct()
    
    def filter_year_left(self, queryset, name, value):
        return queryset.filter(
            positions__end_date__year=value
        ).distinct()
    
    def filter_is_current(self, queryset, name, value):
        if value:
            return queryset.filter(is_active=True)
        else:
            return queryset.filter(is_active=False)
    
    def filter_experience_years(self, queryset, name, value):
        # Filter employees with at least X years of experience
        target_days = value * 365
        matching_ids = []
        
        for employee in queryset:
            total_experience = 0
            for position in employee.positions.all():
                if position.end_date:
                    duration = position.end_date - position.start_date
                else:
                    duration = date.today() - position.start_date
                total_experience += duration.days
            
            if total_experience >= target_days:
                matching_ids.append(employee.id)
        
        return queryset.filter(id__in=matching_ids)

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [CompanyDataPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmployeeFilter
    search_fields = ['company__name']  # Limited due to encryption
    ordering_fields = ['created_at', 'date_joined', 'company__name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Employee.objects.select_related('company').prefetch_related(
            'positions__department', 'documents'
        )
        
        # Filter by user's company if not admin
        user_profile = self.request.user.profile
        if user_profile.role and user_profile.role.name != 'talent_verify_admin':
            if user_profile.company:
                queryset = queryset.filter(company=user_profile.company)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get detailed employment history for an employee"""
        employee = self.get_object()
        serializer = EmployeeHistorySerializer(employee)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_position(self, request, pk=None):
        """Add a new position to an employee"""
        employee = self.get_object()
        
        # End current position if exists
        current_position = employee.positions.filter(is_current=True).first()
        if current_position:
            current_position.is_current = False
            current_position.end_date = request.data.get('start_date', date.today())
            current_position.save()
        
        # Create new position
        department_name = request.data.get('department_name')
        if not department_name:
            return Response({"error": "department_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        department, _ = Department.objects.get_or_create(company=employee.company, name=department_name)
        position_data = request.data.copy()
        position_data['employee'] = employee.id
        position_data['is_current'] = True
        position_data['department_id'] = department.id
        
        serializer = EmployeePositionSerializer(data=position_data)
        if serializer.is_valid():
            serializer.save(created_by=request.user, employee=employee)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get employee analytics"""
        queryset = self.get_queryset()
        
        analytics = {
            'total_employees': queryset.count(),
            'active_employees': queryset.filter(is_active=True).count(),
            'by_department': {},
            'by_employment_type': {},
            'average_tenure_days': 0,
        }
        
        # Department breakdown
        dept_stats = queryset.values(
            'positions__department__name'
        ).annotate(
            count=Count('id', distinct=True)
        ).filter(positions__is_current=True)
        
        for stat in dept_stats:
            dept_name = stat['positions__department__name'] or 'Unknown'
            analytics['by_department'][dept_name] = stat['count']
        
        # Employment type breakdown
        emp_type_stats = queryset.values(
            'positions__employment_type'
        ).annotate(
            count=Count('id', distinct=True)
        ).filter(positions__is_current=True)
        
        for stat in emp_type_stats:
            emp_type = stat['positions__employment_type'] or 'Unknown'
            analytics['by_employment_type'][emp_type] = stat['count']
        
        return Response(analytics)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export employee data (for authorized users only)"""
        # Check export permission
        # user_profile = request.user.profile
        # if not user_profile.permissions.get('export_data', False):
        #     return Response(
        #         {'error': 'You do not have permission to export data'}, 
        #         status=status.HTTP_403_FORBIDDEN
        #     )
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Prepare export data
        export_data = []
        for employee in queryset:
            current_pos = employee.current_position
            export_data.append({
                'name': employee.name,
                'employee_id': employee.employee_id,
                'email': employee.email,
                'phone': employee.phone,
                'company': employee.company.name,
                'current_role': current_pos.role if current_pos else '',
                'current_department': current_pos.department.name if current_pos else '',
                'start_date': current_pos.start_date if current_pos else '',
                'employment_type': current_pos.employment_type if current_pos else '',
                'is_active': employee.is_active,
            })
        
        return Response({
            'data': export_data,
            'total_records': len(export_data),
            'exported_at': datetime.now().isoformat(),
        })