from django.db import models
from users.models import User
from companies.models import Company
import uuid

class BulkUploadJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partially Completed'),
    ]
    
    OPERATION_CHOICES = [
        ('employee_import', 'Employee Import'),
        ('company_import', 'Company Import'),
        ('position_import', 'Position Import'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operation_type = models.CharField(max_length=50, choices=OPERATION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    total_records = models.PositiveIntegerField(default=0)
    processed_records = models.PositiveIntegerField(default=0)
    success_records = models.PositiveIntegerField(default=0)
    error_records = models.PositiveIntegerField(default=0)
    error_details = models.JSONField(default=list)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.operation_type} - {self.status} ({self.progress_percentage}%)"

