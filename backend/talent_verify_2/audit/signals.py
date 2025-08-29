from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from companies.models import Company, Department
from employees.models import Employee, EmployeePosition
from .models import AuditLog
import json

class ModelAuditMixin:
    """Mixin to add audit capabilities to models"""
    
    def get_audit_fields(self):
        """Override this method to specify which fields to audit"""
        return [field.name for field in self._meta.fields if field.name not in ['id', 'created_at', 'updated_at']]
    
    def get_field_value(self, field_name):
        """Get the value of a field, handling encrypted fields"""
        value = getattr(self, field_name, None)
        
        # Handle encrypted fields - don't log the encrypted values
        if field_name.startswith('encrypted_'):
            return '[ENCRYPTED]'
        
        # Handle foreign keys
        if hasattr(value, 'pk'):
            return {'id': value.pk, 'name': str(value)}
        
        # Handle dates and datetimes
        if hasattr(value, 'isoformat'):
            return value.isoformat()
        
        return value

# Store original values before save
@receiver(pre_save)
def store_original_values(sender, instance, **kwargs):
    """Store original values before save for comparison"""
    if not hasattr(instance, '_state') or instance._state.adding:
        return
    
    try:
        original = sender.objects.get(pk=instance.pk)
        instance._original_values = {}
        
        if hasattr(instance, 'get_audit_fields'):
            for field in instance.get_audit_fields():
                instance._original_values[field] = original.get_field_value(field)
        
    except sender.DoesNotExist:
        instance._original_values = {}

# Company auditing
@receiver(post_save, sender=Company)
def audit_company_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    
    old_values = getattr(instance, '_original_values', {}) if not created else {}
    new_values = {}
    
    if hasattr(instance, 'get_audit_fields'):
        for field in instance.get_audit_fields():
            new_values[field] = instance.get_field_value(field)
    
    # Only log if there are actual changes
    if created or old_values != new_values:
        AuditLog.objects.create(
            content_object=instance,
            action=action,
            description=f"Company '{instance.name}' was {action}d",
            old_values=old_values if not created else None,
            new_values=new_values,
            user=getattr(instance, 'created_by', None),
        )

@receiver(post_delete, sender=Company)
def audit_company_delete(sender, instance, **kwargs):
    AuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action='delete',
        description=f"Company '{instance.name}' was deleted",
        old_values={'name': instance.name, 'registration_number': instance.registration_number},
        # user would need to be passed from the view
    )

# Employee auditing
@receiver(post_save, sender=Employee)
def audit_employee_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    
    old_values = getattr(instance, '_original_values', {}) if not created else {}
    new_values = {
        'name': '[ENCRYPTED]',  # Don't log actual encrypted data
        'company': {'id': instance.company.pk, 'name': instance.company.name},
        'is_active': instance.is_active,
    }
    
    if created or old_values != new_values:
        AuditLog.objects.create(
            content_object=instance,
            action=action,
            description=f"Employee in company '{instance.company.name}' was {action}d",
            old_values=old_values if not created else None,
            new_values=new_values,
            user=getattr(instance, 'created_by', None),
        )

# Employee Position auditing
@receiver(post_save, sender=EmployeePosition)
def audit_position_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    
    old_values = getattr(instance, '_original_values', {}) if not created else {}
    new_values = {
        'employee': f"Employee ID {instance.employee.pk}",
        'role': instance.role,
        'department': instance.department.name,
        'start_date': instance.start_date.isoformat(),
        'end_date': instance.end_date.isoformat() if instance.end_date else None,
        'is_current': instance.is_current,
        'employment_type': instance.employment_type,
    }
    
    if created or old_values != new_values:
        AuditLog.objects.create(
            content_object=instance,
            action=action,
            description=f"Position '{instance.role}' for employee was {action}d",
            old_values=old_values if not created else None,
            new_values=new_values,
            user=getattr(instance, 'created_by', None),
        )