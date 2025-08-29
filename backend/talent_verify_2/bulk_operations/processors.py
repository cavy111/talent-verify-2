import pandas as pd
import csv
from typing import List, Dict, Any, Tuple
from django.core.exceptions import ValidationError
from django.db import transaction
from companies.models import Company, Department
from employees.models import Employee, EmployeePosition
from .models import BulkUploadJob
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BulkUploadProcessor:
    """Base class for bulk upload operations"""
    
    def __init__(self, job: BulkUploadJob):
        self.job = job
        self.errors = []
        self.success_count = 0

    def update_progress(self, processed: int, total: int):
        """Update job progress"""
        self.job.processed_records = processed
        self.job.progress_percentage = (processed / total * 100) if total > 0 else 0
        self.job.save(update_fields=['processed_records', 'progress_percentage'])
    
    def add_error(self, row_number: int, field: str, error: str):
        """Add error to the job"""
        self.errors.append({
            'row': row_number,
            'field': field,
            'error': error
        })

    def finalize_job(self):
        """Finalize the job with results"""
        self.job.success_records = self.success_count
        self.job.error_records = len(self.errors)
        self.job.error_details = self.errors
        self.job.completed_at = datetime.now()
        
        if self.errors and self.success_count > 0:
            self.job.status = 'partial'
        elif self.errors:
            self.job.status = 'failed'
        else:
            self.job.status = 'completed'
            
        self.job.save()

class EmployeeBulkProcessor(BulkUploadProcessor):
    """Process employee bulk uploads"""
    
    REQUIRED_FIELDS = ['name', 'role', 'department', 'start_date']
    OPTIONAL_FIELDS = ['employee_id', 'email', 'phone', 'employment_type', 'salary', 'duties']

    def process_file(self, file_path: str) -> bool:
        """Process employee CSV/Excel file"""

        if self.job.created_by.profile.role.name == 'talent_verify_admin':
            self.REQUIRED_FIELDS.append('company_name')
        try:
            self.job.status = 'processing'
            self.job.started_at = datetime.now()
            self.job.save()
            
            # Read file based on extension
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                raise ValueError("Unsupported file format")
            
            self.job.total_records = len(df)
            self.job.save()
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    self.process_employee_row(index + 2, row)  # +2 for header and 0-indexing
                    self.success_count += 1
                except Exception as e:
                    self.add_error(index + 2, 'general', str(e))
                
                # Update progress every 10 records
                if (index + 1) % 10 == 0:
                    self.update_progress(index + 1, len(df))
            
            # Final progress update
            self.update_progress(len(df), len(df))
            self.finalize_job()
            return True
            
        except Exception as e:
            logger.error(f"Bulk upload failed: {str(e)}")
            self.job.status = 'failed'
            self.job.error_details = [{'row': 0, 'field': 'file', 'error': str(e)}]
            self.job.save()
            return False
        
    @transaction.atomic
    def process_employee_row(self, row_number: int, row_data: pd.Series):
        """Process a single employee row"""
        data = row_data.to_dict()
        
        # Validate required fields
        for field in self.REQUIRED_FIELDS:
            if field not in data or pd.isna(data[field]) or str(data[field]).strip() == '':
                raise ValueError(f"Missing required field: {field}")
        
        # Get or create company
        if self.job.created_by.profile.role.name == 'talent_verify_admin':
            company_name = str(data['company_name']).strip()
            try:
                company = Company.objects.get(name__iexact=company_name)
            except Company.DoesNotExist:
                raise ValueError(f"Company '{company_name}' not found")
        else:
            company = self.job.created_by.profile.company
        
        # print(company)

        # Get or create department
        department_name = str(data['department']).strip()
        department, created = Department.objects.get_or_create(
            company=company,
            name__iexact=department_name,
            defaults={'name': department_name}
        )
        
        # Check if employee already exists
        employee_name = str(data['name']).strip()
        employee_id = str(data.get('employee_id', '')).strip()
        
        # Since names are encrypted, we need to check differently
        # For now, we'll create new employees - in production, you'd want better duplicate detection
        
        # Create employee
        employee_data = {
            'company': company,
            'is_active': True,
        }
        
        employee = Employee.objects.create(**employee_data)
        
        # Set encrypted fields
        employee.name = employee_name
        employee.employee_id = employee_id
        employee.email = str(data.get('email', '')).strip()
        employee.phone = str(data.get('phone', '')).strip()
        employee.save()
        
        # Create position
        position_data = {
            'employee': employee,
            'department': department,
            'role': str(data['role']).strip(),
            'duties': str(data.get('duties', '')).strip(),
            'start_date': self.parse_date(data['start_date']),
            'employment_type': str(data.get('employment_type', 'full_time')).strip(),
            'is_current': True,
            'created_by': self.job.created_by,
        }
        
        # Add salary if provided
        if 'salary' in data and not pd.isna(data['salary']):
            try:
                position_data['salary'] = float(data['salary'])
            except (ValueError, TypeError):
                pass  # Skip invalid salary values
        
        EmployeePosition.objects.create(**position_data)

    def parse_date(self, date_value):
        """Parse date from various formats"""
        if pd.isna(date_value):
            raise ValueError("Invalid date")
        
        # Try different date formats
        date_formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']
        
        date_str = str(date_value).strip()

        # If it looks like a datetime with time, strip off the time
        if " " in date_str:
            date_str = date_str.split(" ")[0]

        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        raise ValueError(f"Unable to parse date: {date_str}")
    
class CompanyBulkProcessor(BulkUploadProcessor):
    """Process company bulk uploads"""
    
    REQUIRED_FIELDS = ['name', 'registration_number', 'registration_date', 'contact_person', 'email', 'address']
    OPTIONAL_FIELDS = ['phone', 'employee_count', 'departments']

    def process_file(self, file_path: str) -> bool:
        """Process company CSV/Excel file"""
        try:
            self.job.status = 'processing'
            self.job.started_at = datetime.now()
            self.job.save()
            
            # Read file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                raise ValueError("Unsupported file format")
            
            self.job.total_records = len(df)
            self.job.save()
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    self.process_company_row(index + 2, row)
                    self.success_count += 1
                except Exception as e:
                    self.add_error(index + 2, 'general', str(e))
                
                if (index + 1) % 10 == 0:
                    self.update_progress(index + 1, len(df))
            
            self.update_progress(len(df), len(df))
            self.finalize_job()
            return True
            
        except Exception as e:
            logger.error(f"Company bulk upload failed: {str(e)}")
            self.job.status = 'failed'
            self.job.error_details = [{'row': 0, 'field': 'file', 'error': str(e)}]
            self.job.save()
            return False
        
    @transaction.atomic
    def process_company_row(self, row_number: int, row_data: pd.Series):
        """Process a single company row"""
        data = row_data.to_dict()
        
        # Validate required fields
        for field in self.REQUIRED_FIELDS:
            if field not in data or pd.isna(data[field]) or str(data[field]).strip() == '':
                raise ValueError(f"Missing required field: {field}")
        
        # Check for duplicate registration number
        reg_number = str(data['registration_number']).strip()
        if Company.objects.filter(registration_number=reg_number).exists():
            raise ValueError(f"Company with registration number '{reg_number}' already exists")
        
        # Create company
        company_data = {
            'name': str(data['name']).strip(),
            'registration_number': reg_number,
            'registration_date': self.parse_date(data['registration_date']),
            'contact_person': str(data['contact_person']).strip(),
            'email': str(data['email']).strip(),
            'address': str(data['address']).strip(),
            'phone': str(data.get('phone', '')).strip(),
            'employee_count': int(data.get('employee_count', 0)) if not pd.isna(data.get('employee_count')) else 0,
            'created_by': self.job.created_by,
        }
        
        company = Company.objects.create(**company_data)
        
        # Create departments if provided
        if 'departments' in data and not pd.isna(data['departments']):
            dept_names = str(data['departments']).split(',')
            for dept_name in dept_names:
                dept_name = dept_name.strip()
                if dept_name:
                    Department.objects.create(
                        company=company,
                        name=dept_name
                    )
    def parse_date(self, date_value):
        """Parse date from various formats"""
        if pd.isna(date_value):
            raise ValueError("Invalid date")
        
        date_formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']
        date_str = str(date_value).strip()
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        raise ValueError(f"Unable to parse date: {date_str}")