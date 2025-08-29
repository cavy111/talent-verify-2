from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError

class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_system_admin = models.BooleanField(default=False)
    is_company_admin = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_users'
    )
    last_login = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(auto_now_add=True)
    
    # USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    # def clean(self):
    #     # Validate company assignment
    #     if self.is_company_admin and not self.profile.company:
    #         raise ValidationError("Company admin must be assigned to a company")
    #     if not self.is_system_admin and not self.profile.company:
    #         raise ValidationError("Non-system admin users must be assigned to a company")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def role_display(self):
        if self.is_system_admin:
            return "System Administrator"
        elif self.is_company_admin:
            return "Company Administrator"
        else:
            return "Company User"