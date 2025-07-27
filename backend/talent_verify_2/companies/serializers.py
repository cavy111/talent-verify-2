# backend/companies/serializers.py
from rest_framework import serializers
from .models import Company, Department

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'created_at']

class CompanySerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'registration_date', 'registration_number',
            'address', 'contact_person', 'phone', 'email', 
            'employee_count', 'created_at', 'updated_at', 'departments'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)