# backend/employees/models.py
from django.db import models
from authentication.models import User
from companies.models import Company, Department
from cryptography.fernet import Fernet
from django.conf import settings
import base64

class EncryptedField:
    """Custom field for encrypting sensitive data"""
    
    @staticmethod
    def encrypt(value):
        if not value:
            return value
            
        key = settings.ENCRYPTION_KEY.encode()
        f = Fernet(key)
        encrypted_value = f.encrypt(value.encode())
        return base64.urlsafe_b64encode(encrypted_value).decode()
    
    @staticmethod
    def decrypt(encrypted_value):
        if not encrypted_value:
            return encrypted_value
            
        try:
            key = settings.ENCRYPTION_KEY.encode()
            f = Fernet(key)
            decoded_value = base64.urlsafe_b64decode(encrypted_value.encode())
            return f.decrypt(decoded_value).decode()
        except:
            return encrypted_value  # Return as-is if decryption fails

class Employee(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employees')

    # Encrypted fields for PII
    encrypted_name = models.TextField()  # Encrypted name
    encrypted_employee_id = models.TextField(blank=True)  # Encrypted employee ID
    encrypted_email = models.TextField(blank=True)  # Encrypted email
    encrypted_phone = models.TextField(blank=True)  # Encrypted phone

    # Non-encrypted metadata
    is_active = models.BooleanField(default=True)
    date_joined = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.name} - {self.company.name}"
    
    @property
    def name(self):
        return EncryptedField.decrypt(self.encrypted_name)
    
    @name.setter
    def name(self, value):
        self.encrypted_name = EncryptedField.encrypt(value)
    
    @property
    def employee_id(self):
        return EncryptedField.decrypt(self.encrypted_employee_id)
    
    @employee_id.setter
    def employee_id(self, value):
        self.encrypted_employee_id = EncryptedField.encrypt(value)
    
    @property
    def email(self):
        return EncryptedField.decrypt(self.encrypted_email)
    
    @email.setter
    def email(self, value):
        self.encrypted_email = EncryptedField.encrypt(value)
    
    @property
    def phone(self):
        return EncryptedField.decrypt(self.encrypted_phone)
    
    @phone.setter
    def phone(self, value):
        self.encrypted_phone = EncryptedField.encrypt(value)

    @property
    def current_position(self):
        return self.positions.filter(is_current=True).first()

class EmployeePosition(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='positions')
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    role = models.CharField(max_length=255)
    duties = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    employment_type = models.CharField(
        max_length=50,
        choices=[
            ('full_time', 'Full Time'),
            ('part_time', 'Part Time'),
            ('contract', 'Contract'),
            ('intern', 'Intern'),
            ('consultant', 'Consultant'),
        ],
        default='full_time'
    )
    manager = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='direct_reports'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['employee', 'is_current']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def __str__(self):
        return f"{self.employee.name} - {self.role} ({self.start_date})"
    
    def save(self, *args, **kwargs):
        # Ensure only one current position per employee
        if self.is_current:
            EmployeePosition.objects.filter(
                employee=self.employee,
                is_current=True
            ).exclude(pk=self.pk).update(is_current=False)
        
        super().save(*args, **kwargs)

class EmployeeDocument(models.Model):
    """Store employee documents and certifications"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(
        max_length=100,
        choices=[
            ('contract', 'Employment Contract'),
            ('id_copy', 'ID Copy'),
            ('qualification', 'Qualification Certificate'),
            ('reference', 'Reference Letter'),
            ('other', 'Other'),
        ]
    )
    title = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)  # Store encrypted file path
    uploaded_date = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_documents'
    )
    verified_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.employee.name} - {self.title}"