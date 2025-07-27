# backend/companies/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Company
from .serializers import CompanySerializer

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_queryset(self):
        queryset = Company.objects.all()
        search = self.request.query_params.get('search', None)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(registration_number__icontains=search) |
                Q(contact_person__icontains=search)
            )
        
        return queryset

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        company = self.get_object()
        employees = company.employees.all()
        from employees.serializers import EmployeeSerializer
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)