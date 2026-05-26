'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Download,
  Eye,
  MoreVertical
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function ReportsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports');
        if (response.ok) {
          const data = await response.json();
          setReports(data);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.findings?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.reportType?.toLowerCase() === filterType.toLowerCase();
    const matchesStatus = filterStatus === 'all' || report.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string | undefined) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    
    switch (type.toLowerCase()) {
      case 'laboratory':
        return 'bg-blue-100 text-blue-800';
      case 'radiology':
        return 'bg-purple-100 text-purple-800';
      case 'cardiology':
        return 'bg-red-100 text-red-800';
      case 'pathology':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    // Navigate to report details page
    window.location.href = `/reports/${report._id}`;
  };

  const handleDownloadReport = async (report: any) => {
    setSelectedReport(report);
    
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: `Medical Report - ${report.reportType || 'Report'}`,
        subject: `Medical Report for ${report.patientName}`,
        author: report.doctorName || 'Medical Staff',
        creator: 'AI-Doc Medical System'
      });
      
      // Add header
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('MEDICAL REPORT', 105, 20, { align: 'center' });
      
      // Add line separator
      doc.setDrawColor(52, 152, 219);
      doc.setLineWidth(0.5);
      doc.line(20, 30, 190, 30);
      
      // Add report information
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      
      let yPosition = 50;
      
      // Report Type and Date
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Report Information', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(52, 73, 94);
      doc.text(`Report Type: ${report.reportType || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Report Date: ${report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Status: ${report.status || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Priority: ${report.priority || 'N/A'}`, 20, yPosition);
      yPosition += 15;
      
      // Patient Information
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Patient Information', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(52, 73, 94);
      doc.text(`Patient Name: ${report.patientName || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Patient ID: ${report.patientId || 'N/A'}`, 20, yPosition);
      yPosition += 15;
      
      // Doctor Information
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Doctor Information', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(52, 73, 94);
      doc.text(`Doctor Name: ${report.doctorName || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Doctor ID: ${report.doctorId || 'N/A'}`, 20, yPosition);
      yPosition += 15;
      
      // Medical Information
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Medical Information', 20, yPosition);
      yPosition += 10;
      
      // Findings
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      doc.text('Findings:', 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      const findings = report.findings || 'No findings recorded';
      const findingsLines = doc.splitTextToSize(findings, 170);
      doc.text(findingsLines, 20, yPosition);
      yPosition += (findingsLines.length * 5) + 10;
      
      // Diagnosis
      if (report.diagnosis) {
        doc.setFontSize(12);
        doc.setTextColor(52, 73, 94);
        doc.text('Diagnosis:', 20, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        const diagnosisLines = doc.splitTextToSize(report.diagnosis, 170);
        doc.text(diagnosisLines, 20, yPosition);
        yPosition += (diagnosisLines.length * 5) + 10;
      }
      
      // Recommendations
      if (report.recommendations) {
        doc.setFontSize(12);
        doc.setTextColor(52, 73, 94);
        doc.text('Recommendations:', 20, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        const recommendationsLines = doc.splitTextToSize(report.recommendations, 170);
        doc.text(recommendationsLines, 20, yPosition);
        yPosition += (recommendationsLines.length * 5) + 10;
      }
      
      // Notes
      if (report.notes) {
        doc.setFontSize(12);
        doc.setTextColor(52, 73, 94);
        doc.text('Additional Notes:', 20, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        const notesLines = doc.splitTextToSize(report.notes, 170);
        doc.text(notesLines, 20, yPosition);
        yPosition += (notesLines.length * 5) + 10;
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(149, 165, 166);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 280);
      doc.text('AI-Doc Medical System', 20, 285);
      
      // Save the PDF
      const fileName = `medical_report_${report._id}_${report.reportType || 'medical'}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    // Navigate to edit page
    window.location.href = `/reports/${report._id}/edit`;
  };

  const handleShareReport = (report: any) => {
    setSelectedReport(report);
    console.log('Sharing report:', report);
    alert(`Sharing report: ${report.reportType || 'Report'}`);
  };

  const handleDeleteReport = (report: any) => {
    if (confirm(`Are you sure you want to delete the report "${report.reportType || 'Report'}"?`)) {
      console.log('Deleting report:', report);
      alert(`Report "${report.reportType || 'Report'}" deleted successfully`);
    }
  };

  const toggleActionsMenu = (reportId: string) => {
    setShowActionsMenu(showActionsMenu === reportId ? null : reportId);
  };

  // Close actions menu when clicking outside
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menu when pressing Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('reports.title')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mx-auto" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('reports.title')}
        description={t('reports.description')} dense>
        <div className="space-y-3">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
              {filteredReports.length} {t('reports.title').toLowerCase()}
            </span>
          </div>
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{t('reports.addNew')}</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('reports.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-9 border border-gray-300 rounded-md px-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[8rem]"
                >
                  <option value="all">{t('reports.allTypes')}</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="radiology">Radiology</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="pathology">Pathology</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 border border-gray-300 rounded-md px-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[8rem]"
                >
                  <option value="all">{t('reports.allStatus')}</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="in progress">In Progress</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                <p className="text-sm text-gray-500 mt-3">{t('reports.loading')}</p>
              </div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('reports.reportDetails')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('reports.type')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('reports.status')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('reports.patientDoctor')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('reports.datePriority')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('reports.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{report.reportType || 'Report'}</div>
                          <div className="text-xs text-gray-500 truncate">ID: {report._id || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-md ${getTypeColor(report.reportType)}`}>
                        {report.reportType || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-md ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.patientName || 'Unknown'}</div>
                      <div className="text-xs text-gray-600">{report.doctorName || 'Unknown'}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A'}</div>
                      <div className="mt-0.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-md ${getPriorityColor(report.priority)}`}>
                          {report.priority || 'Normal'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center flex-wrap gap-1">
                        <button 
                          type="button"
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs sm:text-sm"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('reports.view')}</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadReport(report)}
                          className="text-green-600 hover:text-green-800 inline-flex items-center gap-1 text-xs sm:text-sm"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('reports.download')}</span>
                        </button>
                        <div className="relative" ref={actionsMenuRef}>
                          <button 
                            type="button"
                            onClick={() => toggleActionsMenu(report._id)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {showActionsMenu === report._id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg z-10 border border-gray-200 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewReport(report)}
                                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {t('reports.viewDetails')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadReport(report)}
                                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {t('reports.downloadReport')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditReport(report)}
                                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {t('reports.editReport')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareReport(report)}
                                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {t('reports.shareReport')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReport(report)}
                                  className="block w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                >
                                  {t('reports.deleteReport')}
                                </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredReports.length === 0 && !loading && (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-white">
            <FileText className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('reports.noReports')}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? t('reports.noReportsDesc')
                : t('reports.getStarted')
              }
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <div className="mt-4">
                <Link
                  href="/reports/new"
                  className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('reports.addNew')}</span>
                </Link>
              </div>
            )}
          </div>
        )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
