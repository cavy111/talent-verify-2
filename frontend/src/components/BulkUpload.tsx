import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { CloudUpload, Download, Refresh, ExpandMore } from '@mui/icons-material';
import { bulkUploadService, AuthService } from '../services/api';
import NavBar from './NavBar';

interface BulkJob {
  id: string;
  operation_type: string;
  status: string;
  file_name: string;
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  progress_percentage: number;
  error_details: Array<{row: number; field: string; error: string}>;
  created_at: string;
  started_at: string;
  completed_at: string;
}

interface Profile{
  role_name: string;
}

const BulkUpload: React.FC = () => {
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [operationType, setOperationType] = useState('employee_import');
  const [profile, setProfile] = useState<Profile | null>(null)
  const navigate = useNavigate();

  useEffect(()=>{
    fetchProfile()
  },[])

  useEffect(() => {
    fetchJobs();
    // Refresh jobs every 30 seconds for processing status
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async() =>{
    try{
      const response = await AuthService.getProfile()
      setProfile(response)
    }catch(e){
      console.log('error fetching profile', e);
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await bulkUploadService.getJobs();
      setJobs(response.data.results || response.data);
    } catch (err) {
      setError('Failed to fetch bulk upload jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validTypes.includes(fileExtension)) {
        setError('Please select a CSV or Excel file');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('operation_type', operationType);

      await bulkUploadService.createJob(formData);
      
      setUploadDialog(false);
      setSelectedFile(null);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async (type: string) => {
    try {
      const response = await bulkUploadService.downloadTemplate(type);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      await bulkUploadService.retryJob(jobId);
      fetchJobs();
    } catch (err) {
      setError('Failed to retry job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'info';
      case 'partial': return 'warning';
      default: return 'default';
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <>
      <NavBar role_name={profile?.role_name || ''} page='Bulk Upload'/>

      <Container sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Bulk Upload</Typography>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialog(true)}
          >
            New Upload
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Template Downloads */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Download Templates
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Download CSV templates to see the required format for bulk uploads.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                startIcon={<Download />}
                onClick={() => downloadTemplate('employee_import')}
              >
                Employee Template
              </Button>
              {profile?.role_name === 'talent_verify_admin' && <Button
                startIcon={<Download />}
                onClick={() => downloadTemplate('company_import')}
              >
                Company Template
              </Button>}
            </Box>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Operation</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Records</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No bulk upload jobs found
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <React.Fragment key={job.id}>
                    <TableRow>
                      <TableCell>{job.file_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={job.operation_type.replace('_', ' ')} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={job.status} 
                          color={getStatusColor(job.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ width: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={job.progress_percentage} 
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="textSecondary">
                              {Math.round(job.progress_percentage)}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {job.success_records}/{job.total_records}
                          {job.error_records > 0 && (
                            <span style={{ color: 'red' }}> ({job.error_records} errors)</span>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(job.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {(job.status === 'failed' || job.status === 'partial') && (
                          <Button
                            size="small"
                            startIcon={<Refresh />}
                            onClick={() => retryJob(job.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {job.error_details && job.error_details.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                          <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Typography color="error">
                                View {job.error_details.length} Errors
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Row</TableCell>
                                    <TableCell>Field</TableCell>
                                    <TableCell>Error</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {job.error_details.slice(0, 10).map((error, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{error.row}</TableCell>
                                      <TableCell>{error.field}</TableCell>
                                      <TableCell>{error.error}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {job.error_details.length > 10 && (
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                  ... and {job.error_details.length - 10} more errors
                                </Typography>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Upload Dialog */}
        <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Upload Bulk Data</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="dense">
              <InputLabel>Operation Type</InputLabel>
              <Select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                label="Operation Type"
              >
                <MenuItem value="employee_import">Import Employees</MenuItem>
                {profile?.role_name === 'talent_verify_admin' && <MenuItem value="company_import">Import Companies</MenuItem>}
              </Select>
            </FormControl>
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span" fullWidth>
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </Button>
              </label>
            </Box>

            {selectedFile && (
              <Alert severity="info">
                File selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? <CircularProgress size={20} /> : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

export default BulkUpload