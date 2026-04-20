import React, { useState, useEffect } from 'react';
import { FileText, Save, X, Camera, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, User, PenTool } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { inspectionService, type Inspection, type InspectionChecklistItem } from '../../services/inspectionService';
import { roomService } from '../../services/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import FileUpload from '../ui/FileUpload';

interface InspectionFormProps {
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  inspectionType: 'pre' | 'post';
  existingInspection?: Inspection;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const InspectionForm: React.FC<InspectionFormProps> = ({
  leaseId,
  facilityId,
  roomId,
  renterId,
  inspectionType,
  existingInspection,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [checklistItems, setChecklistItems] = useState<InspectionChecklistItem[]>([]);
  const [beforePhotos, setBeforePhotos] = useState<string[]>(existingInspection?.beforePhotos || []);
  const [afterPhotos, setAfterPhotos] = useState<string[]>(existingInspection?.afterPhotos || []);
  const [comments, setComments] = useState(existingInspection?.comments || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Meta fields
  const [roomNumber, setRoomNumber] = useState(existingInspection?.roomNumber || '');
  const [formNumber, setFormNumber] = useState(existingInspection?.formNumber || '');
  const [inspectionDate, setInspectionDate] = useState(
    existingInspection?.inspectionDate?.toDate?.()?.toISOString().split('T')[0] || 
    new Date().toISOString().split('T')[0]
  );
  
  // Signature fields
  const [tenantName, setTenantName] = useState(existingInspection?.tenantName || '');
  const [tenantSignature, setTenantSignature] = useState(existingInspection?.tenantSignature || '');
  const [caretakerName, setCaretakerName] = useState(existingInspection?.caretakerName || '');
  const [caretakerSignature, setCaretakerSignature] = useState(existingInspection?.caretakerSignature || '');
  
  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Room Inside']));
  const [showRepairCostInput, setShowRepairCostInput] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadInspection = async () => {
      if (existingInspection) {
        setChecklistItems(existingInspection.checklistItems || []);
        setBeforePhotos(existingInspection.beforePhotos || []);
        setAfterPhotos(existingInspection.afterPhotos || []);
        setComments(existingInspection.comments || '');
        setRoomNumber(existingInspection.roomNumber || '');
        setFormNumber(existingInspection.formNumber || '');
        setTenantName(existingInspection.tenantName || '');
        setCaretakerName(existingInspection.caretakerName || '');
      } else {
        // Load room number
        try {
          const room = await roomService.getRoomById(roomId);
          if (room) {
            setRoomNumber(room.roomNumber);
          }
        } catch (error) {
          console.error('Error loading room:', error);
        }
        
        // Load default checklist
        const defaultChecklist = inspectionService.getDefaultChecklist();
        setChecklistItems(defaultChecklist);
      }
    };

    loadInspection();
  }, [existingInspection, roomId]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  // Determine if a question is negatively phrased (YES answer = problem)
  const isNegativeQuestion = (question: string): boolean => {
    const negativeKeywords = [
      'holes', 'broken', 'cracked', 'leaks', 'loose',
      'Are there', 'Is.*broken', 'Is.*cracked'
    ];
    return negativeKeywords.some(keyword => 
      new RegExp(keyword, 'i').test(question)
    );
  };

  const handleItemToggle = (itemId: string, answer: 'yes' | 'no') => {
    setChecklistItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          // For negative questions: NO answer = good (condition='yes'), YES answer = bad (condition='no')
          // For positive questions: YES answer = good (condition='yes'), NO answer = bad (condition='no')
          const isNegative = isNegativeQuestion(item.itemName);
          const condition: 'yes' | 'no' = isNegative
            ? (answer === 'no' ? 'yes' : 'no')  // Negative: NO = good, YES = bad
            : (answer === 'yes' ? 'yes' : 'no'); // Positive: YES = good, NO = bad
          
          const updated = { ...item, condition };
          // If condition is 'no' (has issues), show repair cost input
          if (condition === 'no') {
            setShowRepairCostInput(prevInput => ({ ...prevInput, [itemId]: true }));
          } else {
            setShowRepairCostInput(prevInput => ({ ...prevInput, [itemId]: false }));
            updated.repairCost = 0;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRepairCostChange = (itemId: string, cost: number) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, repairCost: cost || 0 } : item
      )
    );
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const handleBeforePhotoUpload = (result: { url: string; name: string }) => {
    setBeforePhotos(prev => [...prev, result.url]);
  };

  const handleAfterPhotoUpload = (result: { url: string; name: string }) => {
    setAfterPhotos(prev => [...prev, result.url]);
  };

  const handleRemovePhoto = (photoUrl: string, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforePhotos(prev => prev.filter(url => url !== photoUrl));
    } else {
      setAfterPhotos(prev => prev.filter(url => url !== photoUrl));
    }
  };

  // Group items by section
  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, InspectionChecklistItem[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomNumber.trim()) {
      alert('Please enter the room number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const inspectionData: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'> = {
        leaseId,
        facilityId,
        roomId,
        renterId,
        type: inspectionType,
        roomNumber: roomNumber.trim(),
        formNumber: formNumber.trim() || undefined,
        checklistItems,
        beforePhotos,
        afterPhotos: inspectionType === 'post' ? afterPhotos : undefined,
        totalRepairCost: checklistItems.reduce((sum, item) => sum + (item.repairCost || 0), 0),
        tenantName: tenantName.trim() || undefined,
        tenantSignature: tenantSignature || undefined,
        tenantSignatureDate: (tenantName.trim() && tenantSignature) ? Timestamp.now() : undefined,
        caretakerName: caretakerName.trim() || undefined,
        caretakerSignature: caretakerSignature || undefined,
        caretakerSignatureDate: (caretakerName.trim() && caretakerSignature) ? Timestamp.now() : undefined,
        comments: comments.trim() || undefined,
        inspectedBy: user?.uid || 'unknown',
        inspectionDate: Timestamp.fromDate(new Date(inspectionDate)),
        status: 'completed',
      };

      if (existingInspection?.id) {
        await inspectionService.updateInspection(existingInspection.id, inspectionData);
      } else {
        await inspectionService.createInspection(inspectionData);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving inspection:', error);
      alert('Failed to save inspection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRepairCost = checklistItems.reduce((sum, item) => sum + (item.repairCost || 0), 0);
  const itemsWithIssues = checklistItems.filter(item => item.condition === 'no').length;
  const completedItems = checklistItems.filter(item => item.condition !== undefined).length;
  const progressPercentage = checklistItems.length > 0 ? (completedItems / checklistItems.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {inspectionType === 'pre' ? 'Pre-Inspection' : 'Post-Inspection'}
              </h2>
              <p className="text-sm text-gray-400">
                {existingInspection ? 'Edit Inspection' : 'Complete Inspection Form'}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Meta Fields */}
          <Card className="p-4 bg-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Inspection Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Room Number"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
                placeholder="e.g., A2-11"
              />
              <Input
                label="Date"
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                required
              />
              <Input
                label="Form Number (Optional)"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
          </Card>

          {/* Progress Indicator */}
          <Card className="p-4 bg-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Progress</span>
              <span className="text-sm text-gray-400">
                {completedItems} / {checklistItems.length} items
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {itemsWithIssues > 0 && (
              <p className="text-xs text-red-400 mt-2">
                ⚠️ {itemsWithIssues} item(s) require repair
              </p>
            )}
          </Card>

          {/* Instructions */}
          <Card className="p-4 bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-300 mb-3">
              <strong>Instructions:</strong> Please inspect the room with the caretaker and mark <strong>YES</strong> or <strong>NO</strong> for each item.
              <br />
              <span className="text-xs text-blue-400 mt-2 block">
                💡 Green button = Good condition | Red button = Issue found
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allSections = Object.keys(groupedItems);
                  setExpandedSections(new Set(allSections));
                }}
                className="text-xs"
              >
                Expand All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpandedSections(new Set())}
                className="text-xs"
              >
                Collapse All
              </Button>
            </div>
          </Card>

          {/* Checklist by Sections */}
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([sectionName, items]) => (
              <Card key={sectionName} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(sectionName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-white">
                      Section {Object.keys(groupedItems).indexOf(sectionName) + 1}: {sectionName}
                    </h3>
                    <span className="text-xs text-gray-400">
                      ({items.filter(i => i.condition === 'no').length} issues)
                    </span>
                  </div>
                  {expandedSections.has(sectionName) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedSections.has(sectionName) && (
                  <div className="px-4 pb-4 space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border-2 ${
                          item.condition === 'no'
                            ? 'border-red-500/30 bg-red-500/10'
                            : 'border-gray-700 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-white font-medium">
                              {item.itemNumber}. {item.itemName}
                            </p>
                          </div>
                        </div>

                        {/* Yes/No Toggle Buttons - Mobile Optimized */}
                        {(() => {
                          const isNegative = isNegativeQuestion(item.itemName);
                          // Determine which button represents "good condition"
                          // Negative Q: NO answer = good, Positive Q: YES answer = good
                          const yesIsGood = !isNegative;
                          const noIsGood = isNegative;
                          const yesSelected = isNegative 
                            ? (item.condition === 'no')  // Negative: YES answer means condition='no' (bad)
                            : (item.condition === 'yes'); // Positive: YES answer means condition='yes' (good)
                          const noSelected = isNegative
                            ? (item.condition === 'yes')  // Negative: NO answer means condition='yes' (good)
                            : (item.condition === 'no');  // Positive: NO answer means condition='no' (bad)
                          
                          return (
                            <div className="flex gap-2 mb-3">
                              <button
                                type="button"
                                onClick={() => handleItemToggle(item.id, 'yes')}
                                className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all touch-manipulation min-h-[60px] ${
                                  yesSelected && yesIsGood
                                    ? 'bg-green-500 text-white shadow-lg scale-105 ring-2 ring-green-300'
                                    : yesSelected && !yesIsGood
                                    ? 'bg-red-500 text-white shadow-lg scale-105 ring-2 ring-red-300'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                                YES
                              </button>
                              <button
                                type="button"
                                onClick={() => handleItemToggle(item.id, 'no')}
                                className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all touch-manipulation min-h-[60px] ${
                                  noSelected && noIsGood
                                    ? 'bg-green-500 text-white shadow-lg scale-105 ring-2 ring-green-300'
                                    : noSelected && !noIsGood
                                    ? 'bg-red-500 text-white shadow-lg scale-105 ring-2 ring-red-300'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                <XCircle className="w-5 h-5 mx-auto mb-1" />
                                NO
                              </button>
                            </div>
                          );
                        })()}
                        {/* Status indicator */}
                        {item.condition === 'no' && (
                          <div className="text-xs text-red-400 font-medium mb-2 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Issue detected - repair cost required</span>
                          </div>
                        )}

                        {/* Repair Cost Input (shown when NO) */}
                        {item.condition === 'no' && (
                          <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                            <Input
                              label="Repair Cost (R)"
                              type="number"
                              value={item.repairCost || 0}
                              onChange={(e) => handleRepairCostChange(item.id, parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="mb-2"
                            />
                            <Input
                              label="Notes (Optional)"
                              value={item.notes || ''}
                              onChange={(e) => handleNotesChange(item.id, e.target.value)}
                              placeholder="Add notes about the issue..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Total Repair Cost Summary */}
          {totalRepairCost > 0 && (
            <Card className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <div>
                    <p className="text-white font-semibold">Total Repair Cost</p>
                    <p className="text-xs text-gray-400">{itemsWithIssues} item(s) require repair</p>
                  </div>
                </div>
                <span className="text-yellow-400 text-2xl font-bold">
                  R{totalRepairCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Card>
          )}

          {/* Photos Section */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Photos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Before Photos {inspectionType === 'post' && '(Move-in)'}
                </label>
                <FileUpload
                  onUploadComplete={handleBeforePhotoUpload}
                  accept="image/*"
                  maxSize={10}
                  path={`inspections/${leaseId}/before_${Date.now()}.jpg`}
                  metadata={{
                    leaseId,
                    inspectionType,
                    photoType: 'before',
                  }}
                />
                {beforePhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {beforePhotos.map((photoUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photoUrl}
                          alt={`Before ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photoUrl, 'before')}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* After Photos (post-inspection only) */}
              {inspectionType === 'post' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    After Photos (Move-out)
                  </label>
                  <FileUpload
                    onUploadComplete={handleAfterPhotoUpload}
                    accept="image/*"
                    maxSize={10}
                    path={`inspections/${leaseId}/after_${Date.now()}.jpg`}
                    metadata={{
                      leaseId,
                      inspectionType: 'post',
                      photoType: 'after',
                    }}
                  />
                  {afterPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {afterPhotos.map((photoUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photoUrl}
                            alt={`After ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photoUrl, 'after')}
                            className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Comments */}
          <Card className="p-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Any other comments from TENANT please write here:
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter any additional comments..."
            />
          </Card>

          {/* Signatures */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tenant Signature */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="w-5 h-5 text-blue-400" />
                  <h4 className="font-medium text-white">Tenant</h4>
                </div>
                <Input
                  label="Tenant Name"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Enter tenant name"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tenant Signature (Photo)
                  </label>
                  {tenantSignature ? (
                    <div className="relative">
                      <img src={tenantSignature} alt="Tenant signature" className="w-full h-32 object-contain border border-gray-600 rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setTenantSignature('')}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <FileUpload
                      onUploadComplete={(result) => setTenantSignature(result.url)}
                      accept="image/*"
                      maxSize={5}
                      path={`inspections/${leaseId}/signatures/tenant_${Date.now()}.jpg`}
                      metadata={{ type: 'tenant_signature' }}
                    />
                  )}
                </div>
              </div>

              {/* Caretaker Signature */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="w-5 h-5 text-green-400" />
                  <h4 className="font-medium text-white">Caretaker</h4>
                </div>
                <Input
                  label="Caretaker Name"
                  value={caretakerName}
                  onChange={(e) => setCaretakerName(e.target.value)}
                  placeholder="Enter caretaker name"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Caretaker Signature (Photo)
                  </label>
                  {caretakerSignature ? (
                    <div className="relative">
                      <img src={caretakerSignature} alt="Caretaker signature" className="w-full h-32 object-contain border border-gray-600 rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setCaretakerSignature('')}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <FileUpload
                      onUploadComplete={(result) => setCaretakerSignature(result.url)}
                      accept="image/*"
                      maxSize={5}
                      path={`inspections/${leaseId}/signatures/caretaker_${Date.now()}.jpg`}
                      metadata={{ type: 'caretaker_signature' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-2 sticky bottom-0 bg-secondary-900 -mx-2 px-2 border-t border-gray-700">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || checklistItems.length === 0 || !roomNumber.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : existingInspection ? 'Update Inspection' : 'Complete Inspection'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default InspectionForm;
