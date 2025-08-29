import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Pagination
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  ExpandMore,
  Person,
  Business,
  Upload,
  Download,
  Login,
  Logout,
  Edit,
  Delete,
  Add,
  Clear,
  Refresh
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { auditService, AuthService } from '../services/api';
import { TextFieldProps } from '@mui/material/TextField';
import NavBar from './NavBar';

interface AuditLog {
  id: number;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[];
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  ip_address: string | null;
  user_agent: string | null;
  description: string | null;
  extra_data: Record<string, any>;
  timestamp: string;
}

interface AuditFilters {
  action: string;
  table_name: string;
  user: string;
  start_date: Date | null;
  end_date: Date | null;
  search: string;
}

interface Profile {
  role_name: string
}

const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    table_name: '',
    user: '',
    start_date: null,
    end_date: null,
    search: ''
  });
  const [profile, setProfile] = useState<Profile | null>(null)
  const navigate = useNavigate();

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  useEffect(()=>{
    fetchProfile()
  },[])

  const fetchProfile = async() =>{
          try{
            const response = await AuthService.getProfile()
            setProfile(response)
          }catch(e){
            console.log('error fetching profile', e);
          }
        }

  const fetchAuditLogs = async (customFilters?: Partial<AuditFilters>) => {
    setLoading(true);
    try {
      const params = {
        page,
        ...filters,
        ...customFilters,
        start_date: filters.start_date?.toISOString().split('T')[0],
        end_date: filters.end_date?.toISOString().split('T')[0]
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key as keyof typeof params]) {
          delete params[key as keyof typeof params];
        }
      });

      const response = await auditService.getLogs(params);
      setLogs(response.data.results || response.data);
      
      if (response.data.count) {
        setTotalPages(Math.ceil(response.data.count / 20)); // Assuming 20 items per page
      }
    } catch (err: any) {
      setError('Failed to fetch audit logs');
      console.error('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Add fontSize="small" />;
      case 'UPDATE': return <Edit fontSize="small" />;
      case 'DELETE': return <Delete fontSize="small" />;
      case 'VIEW': return <Visibility fontSize="small" />;
      case 'LOGIN': return <Login fontSize="small" />;
      case 'LOGOUT': return <Logout fontSize="small" />;
      case 'EXPORT': return <Download fontSize="small" />;
      case 'BULK_IMPORT': return <Upload fontSize="small" />;
      default: return <Person fontSize="small" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'error';
      case 'VIEW': return 'default';
      case 'LOGIN': return 'primary';
      case 'LOGOUT': return 'secondary';
      case 'EXPORT': return 'warning';
      case 'BULK_IMPORT': return 'info';
      default: return 'default';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const displayNames: Record<string, string> = {
      'companies_company': 'Company',
      'employees_employee': 'Employee',
      'employees_employeeposition': 'Employee Position',
      'companies_department': 'Department',
      'auth_user': 'User',
      'bulk_operations_bulkuploadjob': 'Bulk Upload Job'
    };
    return displayNames[tableName] || tableName;
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const applyFilters = () => {
    setPage(1);
    fetchAuditLogs(filters);
    setFilterDrawer(false);
  };

  const clearFilters = () => {
    const clearedFilters: AuditFilters = {
      action: '',
      table_name: '',
      user: '',
      start_date: null,
      end_date: null,
      search: ''
    };
    setFilters(clearedFilters);
    setPage(1);
    fetchAuditLogs(clearedFilters);
    setFilterDrawer(false);
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialog(true);
  };

  const renderChangesSummary = (log: AuditLog) => {
    if (!log.changed_fields || log.changed_fields.length === 0) {
      return <Typography variant="body2" color="textSecondary">No field changes</Typography>;
    }

    return (
      <Box>
        {log.changed_fields.slice(0, 3).map((field) => (
          <Chip
            key={field}
            label={field}
            size="small"
            sx={{ mr: 0.5, mb: 0.5 }}
          />
        ))}
        {log.changed_fields.length > 3 && (
          <Chip
            label={`+${log.changed_fields.length - 3} more`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <NavBar role_name={profile?.role_name || ''} page='Audit Logs'/>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">System Audit Trail</Typography>
          <Box>
            <Tooltip title="Advanced Filters">
              <IconButton onClick={() => setFilterDrawer(true)}>
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={() => fetchAuditLogs()}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Quick Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Search audit logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                sx={{ flexGrow: 1 }}
                placeholder="Search by user, action, or description..."
              />
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={() => fetchAuditLogs(filters)}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Object</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell>IP Address</TableCell>
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
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(log.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                        <Box>
                          <Typography variant="body2">
                            {log.user 
                              ? `${log.user.first_name} ${log.user.last_name}`.trim() || log.user.username
                              : 'System'
                            }
                          </Typography>
                          {log.user && (
                            <Typography variant="caption" color="textSecondary">
                              @{log.user.username}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getActionIcon(log.action)}
                        label={log.action}
                        color={getActionColor(log.action) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {getTableDisplayName(log.table_name)}
                        </Typography>
                        {log.record_id && (
                          <Typography variant="caption" color="textSecondary">
                            ID: {log.record_id}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {renderChangesSummary(log)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {log.ip_address || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => viewLogDetails(log)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}

        {/* Filter Drawer */}
        <Drawer
          anchor="right"
          open={filterDrawer}
          onClose={() => setFilterDrawer(false)}
        >
          <Box sx={{ width: 350, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Advanced Filters
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid size={{xs:12}}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    label="Action"
                  >
                    <MenuItem value="">All Actions</MenuItem>
                    <MenuItem value="CREATE">Create</MenuItem>
                    <MenuItem value="UPDATE">Update</MenuItem>
                    <MenuItem value="DELETE">Delete</MenuItem>
                    <MenuItem value="VIEW">View</MenuItem>
                    <MenuItem value="LOGIN">Login</MenuItem>
                    <MenuItem value="LOGOUT">Logout</MenuItem>
                    <MenuItem value="EXPORT">Export</MenuItem>
                    <MenuItem value="BULK_IMPORT">Bulk Import</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12}}>
                <FormControl fullWidth>
                  <InputLabel>Object Type</InputLabel>
                  <Select
                    value={filters.table_name}
                    onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
                    label="Object Type"
                  >
                    <MenuItem value="">All Objects</MenuItem>
                    <MenuItem value="companies_company">Companies</MenuItem>
                    <MenuItem value="employees_employee">Employees</MenuItem>
                    <MenuItem value="employees_employeeposition">Employee Positions</MenuItem>
                    <MenuItem value="companies_department">Departments</MenuItem>
                    <MenuItem value="auth_user">Users</MenuItem>
                    <MenuItem value="bulk_operations_bulkuploadjob">Bulk Upload Jobs</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12}}>
                <TextField
                  fullWidth
                  label="User"
                  value={filters.user}
                  onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                  placeholder="Username or name"
                />
              </Grid>

              <Grid size={{xs:12}}>
                <MuiDatePicker
                  label="Start Date"
                  value={filters.start_date}
                  onChange={(date) => setFilters({ ...filters, start_date: date })}
                  slotProps={{
                    textField: {
                    fullWidth: true,
                    },
                    }}
                />
              </Grid>

              <Grid size={{xs:12}}>
                <MuiDatePicker
                  label="End Date"
                  value={filters.end_date}
                  onChange={(date) => setFilters({ ...filters, end_date: date })}
                  slotProps={{
                    textField: {
                    fullWidth: true,
                    },
                    }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={applyFilters}
                fullWidth
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                onClick={clearFilters}
                fullWidth
              >
                Clear All
              </Button>
            </Box>
          </Box>
        </Drawer>

        {/* Log Detail Dialog */}
        <Dialog
          open={detailDialog}
          onClose={() => setDetailDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Audit Log Details
            {selectedLog && (
              <Typography variant="subtitle2" color="textSecondary">
                {new Date(selectedLog.timestamp).toLocaleString()}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                {/* Basic Information */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Basic Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" color="textSecondary">User:</Typography>
                        <Typography>
                          {selectedLog.user 
                            ? `${selectedLog.user.first_name} ${selectedLog.user.last_name}`.trim() || selectedLog.user.username
                            : 'System'
                          }
                        </Typography>
                      </Grid>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" color="textSecondary">Action:</Typography>
                        <Chip
                          icon={getActionIcon(selectedLog.action)}
                          label={selectedLog.action}
                          color={getActionColor(selectedLog.action) as any}
                          size="small"
                        />
                      </Grid>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" color="textSecondary">Object:</Typography>
                        <Typography>{getTableDisplayName(selectedLog.table_name)}</Typography>
                      </Grid>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" color="textSecondary">Record ID:</Typography>
                        <Typography>{selectedLog.record_id || 'N/A'}</Typography>
                      </Grid>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" color="textSecondary">IP Address:</Typography>
                        <Typography>{selectedLog.ip_address || 'Unknown'}</Typography>
                      </Grid>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" color="textSecondary">Timestamp:</Typography>
                        <Typography>{new Date(selectedLog.timestamp).toLocaleString()}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Description */}
                {selectedLog.description && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Description
                      </Typography>
                      <Typography>{selectedLog.description}</Typography>
                    </CardContent>
                  </Card>
                )}

                {/* Changed Fields */}
                {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Changed Fields ({selectedLog.changed_fields.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedLog.changed_fields.map((field) => (
                          <Chip key={field} label={field} size="small" />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Field Changes */}
                {selectedLog.old_values && selectedLog.new_values && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6">Field Changes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Field</TableCell>
                              <TableCell>Old Value</TableCell>
                              <TableCell>New Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedLog.changed_fields?.map((field) => (
                              <TableRow key={field}>
                                <TableCell>{field}</TableCell>
                                <TableCell>
                                  <Box component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                    {formatFieldValue(selectedLog.old_values?.[field])}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                    {formatFieldValue(selectedLog.new_values?.[field])}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* User Agent */}
                {selectedLog.user_agent && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6">Technical Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        User Agent:
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {selectedLog.user_agent}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Extra Data */}
                {selectedLog.extra_data && Object.keys(selectedLog.extra_data).length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6">Additional Data</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedLog.extra_data, null, 2)}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default Audit;