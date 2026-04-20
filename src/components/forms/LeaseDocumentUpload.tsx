import React, { useState } from 'react';
import { FileText, Camera, Upload, X, CheckCircle, Image } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FileUpload from '../ui/FileUpload';

interface LeaseDocumentUploadProps {
  leaseId: string;
  existingLease?: {
    signedLeasePhotoUrl?: string;
    idDocumentPhotoUrl?: string;
    acceptedAt?: any;
    acceptedBy?: string;
  };
  onSuccess: (data: {
    signedLeasePhotoUrl?: string;
    idDocumentPhotoUrl?: string;
    acceptedAt: Timestamp;
    acceptedBy: string;
  }) => void;
  onCancel?: () => void;
}

const LeaseDocumentUpload: React.FC<LeaseDocumentUploadProps> = ({
  leaseId,
  existingLease,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [isAccepted, setIsAccepted] = useState(false);
  const [signedLeaseFile, setSignedLeaseFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [signedLeaseUrl, setSignedLeaseUrl] = useState<string | null>(existingLease?.signedLeasePhotoUrl || null);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(existingLease?.idDocumentPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignedLeaseUpload = (result: { url: string; name: string }) => {
    setSignedLeaseUrl(result.url);
    setError(null);
  };

  const handleIdDocumentUpload = (result: { url: string; name: string }) => {
    setIdDocumentUrl(result.url);
    setError(null);
  };

  const handleFileSelect = (type: 'lease' | 'id', file: File) => {
    if (type === 'lease') {
      setSignedLeaseFile(file);
    } else {
      setIdDocumentFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate that lease is accepted
    if (!isAccepted) {
      setError('Please accept the lease agreement before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSignedLeaseUrl = signedLeaseUrl;
      let finalIdDocumentUrl = idDocumentUrl;

      // Upload signed lease photo if new file provided
      if (signedLeaseFile && !signedLeaseUrl) {
        setIsUploading(true);
        const leaseUpload = await storageService.uploadLeaseDocument(
          signedLeaseFile,
          leaseId,
          'signed_lease'
        );
        finalSignedLeaseUrl = leaseUpload.url;
        setIsUploading(false);
      }

      // Upload ID document photo if new file provided
      if (idDocumentFile && !idDocumentUrl) {
        setIsUploading(true);
        const idUpload = await storageService.uploadLeaseDocument(
          idDocumentFile,
          leaseId,
          'id_document'
        );
        finalIdDocumentUrl = idUpload.url;
        setIsUploading(false);
      }

      // Validate that at least one document is uploaded
      if (!finalSignedLeaseUrl && !finalIdDocumentUrl) {
        setError('Please upload at least one document (signed lease or ID document).');
        setIsSubmitting(false);
        return;
      }

      // Call success callback with document URLs and acceptance data
      onSuccess({
        signedLeasePhotoUrl: finalSignedLeaseUrl || undefined,
        idDocumentPhotoUrl: finalIdDocumentUrl || undefined,
        acceptedAt: Timestamp.now(),
        acceptedBy: user?.uid || 'unknown',
      });
    } catch (err: any) {
      console.error('Error uploading lease documents:', err);
      setError(err.message || 'Failed to upload documents. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Lease Document Upload</h2>
              <p className="text-sm text-gray-400">Upload signed lease and ID documents</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lease Acceptance Checkbox */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                required
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  I accept this lease agreement
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  By checking this box, you acknowledge that you have read and agree to the lease terms.
                </p>
              </div>
            </label>
          </div>

          {/* Signed Lease Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Signed Lease Document Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Upload a photo of the physically signed lease document
            </p>
            {signedLeaseUrl ? (
              <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-white">Lease document uploaded</p>
                    <a
                      href={signedLeaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-400 hover:underline"
                    >
                      View document
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSignedLeaseUrl(null);
                    setSignedLeaseFile(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <FileUpload
                onUploadComplete={handleSignedLeaseUpload}
                accept="image/*"
                maxSize={10}
                path={`leases/${leaseId}/documents/signed_lease_${Date.now()}.jpg`}
                metadata={{
                  leaseId,
                  documentType: 'signed_lease',
                  uploadedAt: new Date().toISOString(),
                }}
              />
            )}
          </div>

          {/* ID Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ID Document Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Upload a photo of the tenant's ID document
            </p>
            {idDocumentUrl ? (
              <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-white">ID document uploaded</p>
                    <a
                      href={idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-400 hover:underline"
                    >
                      View document
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIdDocumentUrl(null);
                    setIdDocumentFile(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <FileUpload
                onUploadComplete={handleIdDocumentUpload}
                accept="image/*"
                maxSize={10}
                path={`leases/${leaseId}/documents/id_document_${Date.now()}.jpg`}
                metadata={{
                  leaseId,
                  documentType: 'id_document',
                  uploadedAt: new Date().toISOString(),
                }}
              />
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isUploading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={!isAccepted || isSubmitting || isUploading || (!signedLeaseUrl && !idDocumentUrl)}
              className="flex-1"
            >
              {isUploading
                ? 'Uploading...'
                : isSubmitting
                ? 'Saving...'
                : 'Save Documents'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LeaseDocumentUpload;

