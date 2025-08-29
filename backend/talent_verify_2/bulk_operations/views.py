from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid
from .models import BulkUploadJob
from .serializers import BulkUploadJobSerializer, BulkUploadCreateSerializer
from .processors import EmployeeBulkProcessor, CompanyBulkProcessor
# from .tasks import process_bulk_upload  # We'll create this for async processing
from authentication.permissions import RoleBasedPermission, CompanyDataPermission
from django.http import HttpResponse

class BulkUploadViewSet(viewsets.ModelViewSet):
    serializer_class = BulkUploadJobSerializer
    permission_classes = [CompanyDataPermission]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        queryset = BulkUploadJob.objects.all()
        
        # Filter by user's company if not admin
        if user.profile.role.name != 'talent_verify_admin':
            if user.profile.company:
                queryset = queryset.filter(company=user.profile.company)
            else:
                queryset = queryset.filter(created_by=user)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Upload file and create bulk upload job"""
        serializer = BulkUploadCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            # Save uploaded file
            uploaded_file = serializer.validated_data['file']
            file_extension = os.path.splitext(uploaded_file.name)[1]
            file_name = f"bulk_upload_{uuid.uuid4()}{file_extension}"
            file_path = default_storage.save(f"bulk_uploads/{file_name}", ContentFile(uploaded_file.read()))
            full_file_path = default_storage.path(file_path)
            
            # Create job
            job = BulkUploadJob.objects.create(
                operation_type=serializer.validated_data['operation_type'],
                file_name=uploaded_file.name,
                file_path=full_file_path,
                created_by=request.user,
                company=serializer.validated_data.get('company') or request.user.profile.company
            )
            
            # Process file asynchronously (for now, we'll process synchronously)
            # In production, use Celery: process_bulk_upload.delay(job.id)
            self.process_upload_sync(job)
            
            return Response(
                BulkUploadJobSerializer(job).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def process_upload_sync(self, job):
        """Process upload synchronously (for MVP)"""
        try:
            if job.operation_type == 'employee_import':
                processor = EmployeeBulkProcessor(job)
            elif job.operation_type == 'company_import':
                processor = CompanyBulkProcessor(job)
            else:
                job.status = 'failed'
                job.error_details = [{'error': 'Unsupported operation type'}]
                job.save()
                return
            
            processor.process_file(job.file_path)
            
        except Exception as e:
            job.status = 'failed'
            job.error_details = [{'error': str(e)}]
            job.save()


    @action(detail=False, methods=['get'])
    def download_template(self, request, pk=None):
        """Download template file for bulk upload"""
        operation_type = request.query_params.get('type', 'employee_import')
        
        if operation_type == 'employee_import':
            template_data = {
                'name': ['John Doe', 'Jane Smith'],
                'employee_id': ['EMP001', 'EMP002'],
                'email': ['john@company.com', 'jane@company.com'],
                'phone': ['+1234567890', '+1234567891'],
                # 'company_name': ['ACME Corporation', 'ACME Corporation'],
                'department': ['Engineering', 'HR'],
                'role': ['Software Developer', 'HR Manager'],
                'start_date': ['2023-01-15', '2023-02-01'],
                'employment_type': ['full_time', 'full_time'],
                'salary': [75000, 65000],
                'duties': ['Develop software applications', 'Manage HR operations']
            }
            user = self.request.user
            if user.profile.role.name == 'talent_verify_admin':
                template_data['company_name'] = ['ACME Corporation', 'ACME Corporation']
        elif operation_type == 'company_import':
            template_data = {
                'name': ['ACME Corporation', 'Tech Solutions Ltd'],
                'registration_number': ['REG123456', 'REG789012'],
                'registration_date': ['2020-01-01', '2019-06-15'],
                'contact_person': ['John CEO', 'Jane Manager'],
                'email': ['contact@acme.com', 'info@techsolutions.com'],
                'phone': ['+1234567890', '+1987654321'],
                'address': ['123 Business St, City', '456 Tech Ave, City'],
                'employee_count': [150, 50],
                'departments': ['Engineering,HR,Sales', 'Development,Support']
            }
        else:
            return Response({'error': 'Invalid template type'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create CSV content
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=template_data.keys())
        writer.writeheader()
        
        # Write sample rows
        for i in range(len(list(template_data.values())[0])):
            row = {key: values[i] for key, values in template_data.items()}
            writer.writerow(row)
        
        # response = Response(
        #     output.getvalue(),
        #     content_type='text/csv',
        #     headers={'Content-Disposition': f'attachment; filename="{operation_type}_template.csv"'}
        # )

        # Use HttpResponse to serve the CSV
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{operation_type}_template.csv"'
        
        return response
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed bulk upload job"""
        job = self.get_object()
        
        if job.status not in ['failed', 'partial']:
            return Response(
                {'error': 'Only failed or partial jobs can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset job status
        job.status = 'pending'
        job.processed_records = 0
        job.success_records = 0
        job.error_records = 0
        job.error_details = []
        job.progress_percentage = 0
        job.started_at = None
        job.completed_at = None
        job.save()
        
        # Process again
        self.process_upload_sync(job)
        
        return Response(BulkUploadJobSerializer(job).data)
    
    # @action(detail=False, methods=['post'])
    # def upload_companies(self, request):
    #     """Upload companies file"""
    #     # Set operation_type and call create
    #     mutable_data = request.data.copy()
    #     mutable_data['operation_type'] = 'company_import'
    #     request._full_data = mutable_data
    #     return self.create(request)

    # @action(detail=False, methods=['post'])
    # def upload_employees(self, request):
    #     """Upload employees file"""
    #     # Set operation_type and call create
    #     mutable_data = request.data.copy()
    #     mutable_data['operation_type'] = 'employee_import'
    #     request._full_data = mutable_data
    #     return self.create(request)

    # @action(detail=True, methods=['get'])
    # def status(self, request, pk=None):
    #     """Get job status"""
    #     job = self.get_object()
    #     return Response({
    #         'id': job.id,
    #         'status': job.status,
    #         'progress_percentage': job.progress_percentage,
    #         'processed_records': job.processed_records,
    #         'success_records': job.success_records,
    #         'error_records': job.error_records,
    #         'total_records': job.total_records,
    #         'started_at': job.started_at,
    #         'completed_at': job.completed_at
    #     })

    # @action(detail=True, methods=['get'])
    # def errors(self, request, pk=None):
    #     """Get job errors"""
    #     job = self.get_object()
    #     return Response({
    #         'error_details': job.error_details,
    #         'error_records': job.error_records
    #     })

    # @action(detail=False, methods=['get'])
    # def templates(self, request):
    #     """Get template files"""
    #     template_type = request.query_params.get('type')
        
    #     if template_type == 'company':
    #         return self.download_template(request, operation_type='company_import')
    #     elif template_type == 'employee':
    #         return self.download_template(request, operation_type='employee_import')
    #     else:
    #         return Response({'error': 'Invalid template type'}, status=status.HTTP_400_BAD_REQUEST)