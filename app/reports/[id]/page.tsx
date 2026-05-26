'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Share2, 
  Trash2,
  FileText,
  User,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';

export default function ReportDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setReport(data);
        } else {
          setError('Report not found');
        }
      } catch (error) {
        console.error('Error fetching report:', error);
        setError('Failed to fetch report data');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReport();
    }
  }, [params.id]);

  const handleDownloadReport = async () => {
    if (!report) return;
    
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

  const handleDeleteReport = async () => {
    if (!report) return;
    
    if (confirm(`Are you sure you want to delete the report "${report.reportType || 'Report'}"?`)) {
      try {
        const response = await fetch(`/api/reports/${params.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          router.push('/reports');
        } else {
          alert('Failed to delete report');
        }
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('An error occurred while deleting the report');
      }
    }
  };

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

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title="Report Details"
          description="View detailed information about a medical report" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !report) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title="Report Not Found"
          description="The requested report could not be found" dense>
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Report not found</h3>
            <p className="mt-1 text-xs text-gray-600">
              {error || 'The report you are looking for does not exist or has been removed.'}
            </p>
            <div className="mt-4">
              <Link
                href="/reports"
                className="inline-flex h-9 items-center rounded-md border border-transparent bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to Reports
              </Link>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title="Report Details"
        description="View detailed information about a medical report" dense>
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Header */}
          <div>
            <Link
              href="/reports"
              className="mb-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Reports
            </Link>
            
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {report.reportType || 'Medical Report'}
                </h1>
                <p className="mt-0.5 text-xs text-gray-600">
                  Report ID: {report._id}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </button>
                
                <Link
                  href={`/reports/${report._id}/edit`}
                  className="inline-flex h-9 items-center rounded-md border border-transparent bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Link>
              </div>
            </div>
          </div>

          {/* Report Information */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {/* Header Section */}
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {report.reportType || 'Medical Report'}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status || 'Unknown'}
                      </span>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getPriorityColor(report.priority)}`}>
                        {report.priority || 'Normal'} Priority
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-600">Report Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-4 p-4">
              {/* Patient & Doctor Information */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-md bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <h3 className="text-xs font-medium text-gray-900">Patient Information</h3>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{report.patientName || 'N/A'}</p>
                  <p className="text-xs text-gray-600">Patient ID: {report.patientId || 'N/A'}</p>
                </div>
                
                <div className="rounded-md bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-600" />
                    <h3 className="text-xs font-medium text-gray-900">Doctor Information</h3>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{report.doctorName || 'N/A'}</p>
                  <p className="text-xs text-gray-600">{report.department || 'General Medicine'}</p>
                </div>
              </div>

              {/* Report Details */}
              <div className="space-y-3">
                <div>
                  <h3 className="mb-1.5 text-xs font-medium text-gray-900">Findings</h3>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-sm whitespace-pre-wrap text-gray-700">
                      {report.findings || 'No findings recorded'}
                    </p>
                  </div>
                </div>

                {report.diagnosis && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-medium text-gray-900">Diagnosis</h3>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm whitespace-pre-wrap text-gray-700">
                        {report.diagnosis}
                      </p>
                    </div>
                  </div>
                )}

                {report.recommendations && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-medium text-gray-900">Recommendations</h3>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm whitespace-pre-wrap text-gray-700">
                        {report.recommendations}
                      </p>
                    </div>
                  </div>
                )}

                {report.notes && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-medium text-gray-900">Additional Notes</h3>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm whitespace-pre-wrap text-gray-700">
                        {report.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download Report
                  </button>
                  
                  <button type="button" className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800">
                    <Share2 className="mr-1 h-3.5 w-3.5" />
                    Share Report
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/reports/${report._id}/edit`}
                    className="inline-flex h-9 items-center rounded-md border border-transparent bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                    Edit Report
                  </Link>
                  
                  <button
                    type="button"
                    onClick={handleDeleteReport}
                    className="inline-flex h-9 items-center rounded-md border border-transparent bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
