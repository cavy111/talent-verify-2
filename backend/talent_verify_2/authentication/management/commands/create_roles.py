from django.core.management.base import BaseCommand
from authentication.models import UserRole

class Command(BaseCommand):
    help = 'Create default user roles'

    def handle(self, *args, **options):
        roles_data = [
            {
                'name': 'talent_verify_admin',
                'description': 'Full system administrator',
                'permissions': {
                    'company_list': True,
                    'company_create': True,
                    'company_retrieve': True,
                    'company_update': True,
                    'company_destroy': True,
                    'employee_list': True,
                    'employee_create': True,
                    'employee_retrieve': True,
                    'employee_update': True,
                    'employee_destroy': True,
                    'bulk_operations': True,
                }
            },
            {
                'name': 'company_admin',
                'description': 'Company administrator',
                'permissions': {
                    'company_retrieve': True,
                    'company_update': True,
                    'employee_list': True,
                    'employee_create': True,
                    'employee_retrieve': True,
                    'employee_update': True,
                    'employee_destroy': True,
                    'bulk_operations': True,
                }
            },
            {
                'name': 'hr_manager',
                'description': 'HR Manager',
                'permissions': {
                    'company_retrieve': True,
                    'employee_list': True,
                    'employee_create': True,
                    'employee_retrieve': True,
                    'employee_update': True,
                }
            },
            {
                'name': 'employee',
                'description': 'Regular employee',
                'permissions': {
                    'company_retrieve': True,
                    'employee_retrieve': True,  # Only their own data
                }
            }
        ]
        
        for role_data in roles_data:
            role, created = UserRole.objects.get_or_create(
                name=role_data['name'],
                defaults={
                    'description': role_data['description'],
                    'permissions': role_data['permissions']
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created role: {role.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Role already exists: {role.name}')
                )