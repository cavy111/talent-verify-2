from django.db import models
from django.contrib.auth.models import User
from companies.models import Company

class UserRole(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('company_admin', 'Company Administrator'),
        ('hr_manager', 'HR Manager'),
        ('employee', 'Employee'),
        ('talent_verify_admin', 'Talent Verify Admin'),
    ]
    
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField()
    permissions = models.JSONField(default=dict)  # Store permissions as JSON
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.get_name_display()

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(UserRole, on_delete=models.SET_NULL, null=True)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role.name if self.role else 'No Role'}"

    @property
    def permissions(self):
        return self.role.permissions if self.role else {}

# Signal to create profile when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()