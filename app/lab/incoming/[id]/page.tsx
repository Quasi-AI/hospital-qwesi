'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Check,
  X,
  AlertTriangle,
  Clock,
  Cpu,
  User,
  FileText,
  Printer,
  Link as LinkIcon,
  Edit,
  Save,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';

interface DeviceResultParameter {
  parameterCode: string;
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  flag: string;
}

interface DeviceResult {
  _id: string;
  resultNumber: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  sampleId: string;
  patientName?: string;
  matchedLabTestId?: string;
  matchedTestNumber?: string;
  matchStatus: string;
  matchConfidence: number;
  possibleMatches?: {
    labTestId: string;
    testNumber: string;
    patientName: string;
    testType: string;
    confidence: number;
  }[];
  results: DeviceResultParameter[];
  status: string;
  receivedAt: string;
  analyzedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  appliedAt?: string;
  rejectionReason?: string;
  notes?: string;
  hasCriticalValues: boolean;
}

interface LabTest {
  _id: string;
  testNumber: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  testType: string;
  testCategory: string;
  status: string;
}

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [result, setResult] = useState<DeviceResult | null>(null);
  const [labTest, setLabTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedResults, setEditedResults] = useState<DeviceResultParameter[]>([]);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Manual match state
  const [showMatchSearch, setShowMatchSearch] = useState(false);
  const [matchSearchTerm, setMatchSearchTerm] = useState('');
  const [matchSearchResults, setMatchSearchResults] = useState<LabTest[]>([]);
  const [searchingMatch, setSearchingMatch] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchResult();
    }
  }, [params.id]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lab/device-results/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        setLabTest(data.labTest);
        setEditedResults(data.result.results);
        setNotes(data.result.notes || '');
      }
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!result?.matchedLabTestId && !labTest?._id) {
      alert('Please match this result to a lab test first.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/lab/device-results/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          results: editedResults,
          notes,
        }),
      });

      if (response.ok) {
        router.push('/lab/incoming');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to approve result');
      }
    } catch (error) {
      console.error('Error approving result:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/lab/device-results/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason,
          notes,
        }),
      });

      if (response.ok) {
        router.push('/lab/incoming');
      }
    } catch (error) {
      console.error('Error rejecting result:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSearchMatch = async () => {
    if (!matchSearchTerm) return;
    
    try {
      setSearchingMatch(true);
      const response = await fetch(`/api/lab?search=${encodeURIComponent(matchSearchTerm)}&status=pending&status=sample-collected&status=in-progress`);
      if (response.ok) {
        const data = await response.json();
        setMatchSearchResults(data.labTests || []);
      }
    } catch (error) {
      console.error('Error searching lab tests:', error);
    } finally {
      setSearchingMatch(false);
    }
  };

  const handleManualMatch = async (labTestId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/lab/device-results/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match',
          labTestId,
        }),
      });

      if (response.ok) {
        fetchResult();
        setShowMatchSearch(false);
        setMatchSearchTerm('');
        setMatchSearchResults([]);
      }
    } catch (error) {
      console.error('Error matching result:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateResultValue = (index: number, field: keyof DeviceResultParameter, value: string) => {
    const updated = [...editedResults];
    (updated[index] as any)[field] = value;
    setEditedResults(updated);
  };

  const handleSaveEdits = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/lab/device-results/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          results: editedResults,
          notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.deviceResult);
        setEditMode(false);
        alert('Changes saved successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'critical-low':
      case 'critical-high':
        return 'bg-red-100 text-red-800';
      case 'low':
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getFlagLabel = (flag: string) => {
    switch (flag) {
      case 'critical-low':
        return 'Critical Low';
      case 'critical-high':
        return 'Critical High';
      case 'low':
        return 'Low';
      case 'high':
        return 'High';
      default:
        return 'Normal';
    }
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Result Details" description="" dense>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!result) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Result Details" description="" dense>
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Result Not Found</h3>
            <Link href="/lab/incoming" className="text-blue-600 hover:text-blue-700">
              Back to Incoming Results
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={result.resultNumber}
        description="Device result details" dense>
        <div className="space-y-6">
          {/* Back Link */}
          <Link
            href="/lab/incoming"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Incoming Results</span>
          </Link>

          {/* Status Banner */}
          {result.status === 'pending' && result.hasCriticalValues && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Critical Values Detected</p>
                <p className="text-sm text-red-700">This result contains critical values that require immediate attention.</p>
              </div>
            </div>
          )}

          {result.status !== 'pending' && (
            <div className={`rounded-lg p-4 flex items-center gap-3 ${
              result.status === 'applied' ? 'bg-green-50 border border-green-200' :
              result.status === 'rejected' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              {result.status === 'applied' ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : result.status === 'rejected' ? (
                <XCircle className="h-6 w-6 text-red-600" />
              ) : (
                <Check className="h-6 w-6 text-blue-600" />
              )}
              <div>
                <p className={`font-medium ${
                  result.status === 'applied' ? 'text-green-900' :
                  result.status === 'rejected' ? 'text-red-900' :
                  'text-blue-900'
                }`}>
                  {result.status === 'applied' ? 'Results Applied' :
                   result.status === 'rejected' ? 'Results Rejected' :
                   'Results Approved'}
                </p>
                <p className={`text-sm ${
                  result.status === 'applied' ? 'text-green-700' :
                  result.status === 'rejected' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {result.reviewerName && `By ${result.reviewerName}`}
                  {result.reviewedAt && ` on ${new Date(result.reviewedAt).toLocaleString()}`}
                  {result.rejectionReason && ` - ${result.rejectionReason}`}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Results Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
                  <div className="flex items-center gap-2 print:hidden">
                    {result.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setEditMode(!editMode)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                            editMode ? 'bg-blue-100 text-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Edit className="h-4 w-4" />
                          {editMode ? 'Editing' : 'Edit'}
                        </button>
                        {editMode && (
                          <button
                            onClick={handleSaveEdits}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save Changes
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editedResults.map((r, index) => (
                        <tr key={index} className={r.flag.includes('critical') ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{r.parameterName}</p>
                              <p className="text-xs text-gray-500">{r.parameterCode}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="text"
                                value={r.value}
                                onChange={(e) => updateResultValue(index, 'value', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <span className={`font-medium ${r.flag.includes('critical') ? 'text-red-700' : r.flag !== 'normal' ? 'text-yellow-700' : 'text-gray-900'}`}>
                                {r.value}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {r.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {r.normalRange}
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <select
                                value={r.flag}
                                onChange={(e) => updateResultValue(index, 'flag', e.target.value)}
                                className={`px-2 py-1 rounded text-xs font-medium border-0 ${getFlagColor(r.flag)}`}
                              >
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                                <option value="high">High</option>
                                <option value="critical-low">Critical Low</option>
                                <option value="critical-high">Critical High</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getFlagColor(r.flag)}`}>
                                {getFlagLabel(r.flag)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes Section */}
              {result.status === 'pending' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:hidden">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this result..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Rejection Reason (for reject action) */}
              {result.status === 'pending' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:hidden">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rejection Reason</h3>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Required if rejecting this result..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6 print:hidden">
              {/* Device Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{result.deviceCode}</p>
                      <p className="text-xs text-gray-500">{result.deviceName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-900">
                        Received: {new Date(result.receivedAt).toLocaleString()}
                      </p>
                      {result.analyzedAt && (
                        <p className="text-xs text-gray-500">
                          Analyzed: {new Date(result.analyzedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Lab Test */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Matched Lab Test</h3>
                  {result.status === 'pending' && !labTest && (
                    <button
                      onClick={() => setShowMatchSearch(true)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Match Manually
                    </button>
                  )}
                </div>

                {labTest ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <LinkIcon className="h-3 w-3" />
                        Matched
                      </span>
                      <span className="text-xs text-gray-500">{result.matchConfidence}% confidence</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <p className="font-medium text-gray-900">{labTest.testNumber}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        {labTest.patientName}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        {labTest.testType}
                      </div>
                      <Link
                        href={`/lab/${labTest._id}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        View Lab Test →
                      </Link>
                    </div>
                  </div>
                ) : result.possibleMatches && result.possibleMatches.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-orange-600">Multiple possible matches found:</p>
                    {result.possibleMatches.map((match) => (
                      <div key={match.labTestId} className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <p className="font-medium text-gray-900">{match.testNumber}</p>
                        <p className="text-sm text-gray-600">{match.patientName}</p>
                        <p className="text-xs text-gray-500">{match.testType}</p>
                        <button
                          onClick={() => handleManualMatch(match.labTestId)}
                          disabled={saving}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Select this match
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <X className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No lab test matched</p>
                    <p className="text-xs text-gray-400">Sample ID: {result.sampleId}</p>
                  </div>
                )}

                {/* Manual Match Search */}
                {showMatchSearch && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={matchSearchTerm}
                        onChange={(e) => setMatchSearchTerm(e.target.value)}
                        placeholder="Search by test# or patient..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={handleSearchMatch}
                        disabled={searchingMatch}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                    {matchSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {matchSearchResults.map((test) => (
                          <div
                            key={test._id}
                            className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                            onClick={() => handleManualMatch(test._id)}
                          >
                            <p className="font-medium text-sm text-gray-900">{test.testNumber}</p>
                            <p className="text-xs text-gray-500">{test.patientName} - {test.testType}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowMatchSearch(false)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {result.status === 'pending' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleApprove}
                      disabled={saving || (!result.matchedLabTestId && !labTest)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                      Approve & Apply
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={saving || !rejectionReason}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
