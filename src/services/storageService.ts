import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  timeCreated: string;
  updated: string;
}

class StorageService {
  private storage = getStorage();

  /**
   * Upload a file to Firebase Storage
   */
  async uploadFile(
    file: File, 
    path: string, 
    metadata?: { [key: string]: string }
  ): Promise<UploadResult> {
    try {
      const storageRef = ref(this.storage, path);
      
      // Upload file with metadata
      const uploadResult = await uploadBytes(storageRef, file, {
        customMetadata: metadata || {}
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return {
        url: downloadURL,
        path: uploadResult.ref.fullPath,
        name: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[], 
    basePath: string,
    metadata?: { [key: string]: string }
  ): Promise<UploadResult[]> {
    try {
      const uploadPromises = files.map((file, index) => {
        const fileName = `${Date.now()}_${index}_${file.name}`;
        const filePath = `${basePath}/${fileName}`;
        return this.uploadFile(file, filePath, metadata);
      });
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a file
   */
  async getDownloadURL(path: string): Promise<string> {
    try {
      const storageRef = ref(this.storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<FileMetadata[]> {
    try {
      const storageRef = ref(this.storage, path);
      const result = await listAll(storageRef);
      
      const filePromises = result.items.map(async (item) => {
        const metadata = await getMetadata(item);
        return {
          name: metadata.name,
          size: metadata.size,
          type: metadata.contentType || 'unknown',
          timeCreated: metadata.timeCreated,
          updated: metadata.updated
        };
      });
      
      return await Promise.all(filePromises);
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    path: string, 
    metadata: { [key: string]: string }
  ): Promise<void> {
    try {
      const storageRef = ref(this.storage, path);
      await updateMetadata(storageRef, {
        customMetadata: metadata
      });
    } catch (error) {
      console.error('Error updating file metadata:', error);
      throw error;
    }
  }

  /**
   * Upload payment receipt
   */
  async uploadPaymentReceipt(
    file: File, 
    paymentId: string,
    renterId: string
  ): Promise<UploadResult> {
    const fileName = `receipt_${Date.now()}_${file.name}`;
    const path = `payments/${paymentId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      paymentId,
      renterId,
      type: 'payment_receipt',
      uploadedAt: new Date().toISOString()
    });
  }

  /**
   * Upload renter document (ID copy, contract, etc.)
   */
  async uploadRenterDocument(
    file: File, 
    renterId: string,
    documentType: string
  ): Promise<UploadResult> {
    const fileName = `${documentType}_${Date.now()}_${file.name}`;
    const path = `renters/${renterId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      renterId,
      documentType,
      uploadedAt: new Date().toISOString()
    });
  }

  /**
   * Upload lease document
   */
  async uploadLeaseDocument(
    file: File, 
    leaseId: string,
    documentType: string
  ): Promise<UploadResult> {
    const fileName = `${documentType}_${Date.now()}_${file.name}`;
    const path = `leases/${leaseId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      leaseId,
      documentType,
      uploadedAt: new Date().toISOString()
    });
  }

  /**
   * Upload room image
   */
  async uploadRoomImage(
    file: File, 
    roomId: string,
    imageType: 'main' | 'interior' | 'exterior' = 'main'
  ): Promise<UploadResult> {
    const fileName = `${imageType}_${Date.now()}_${file.name}`;
    const path = `rooms/${roomId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      roomId,
      imageType,
      uploadedAt: new Date().toISOString()
    });
  }

  /**
   * Upload facility image
   */
  async uploadFacilityImage(
    file: File, 
    facilityId: string,
    imageType: 'main' | 'exterior' | 'interior' = 'main'
  ): Promise<UploadResult> {
    const fileName = `${imageType}_${Date.now()}_${file.name}`;
    const path = `facilities/${facilityId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      facilityId,
      imageType,
      uploadedAt: new Date().toISOString()
    });
  }

  /**
   * Upload maintenance document/image
   */
  async uploadMaintenanceDocument(
    file: File, 
    maintenanceId: string,
    documentType: string
  ): Promise<UploadResult> {
    const fileName = `${documentType}_${Date.now()}_${file.name}`;
    const path = `maintenance/${maintenanceId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      maintenanceId,
      documentType,
      uploadedAt: new Date().toISOString()
    });
  }

  /**
   * Upload user profile image
   */
  async uploadUserProfileImage(
    file: File, 
    userId: string
  ): Promise<UploadResult> {
    const fileName = `profile_${Date.now()}_${file.name}`;
    const path = `users/${userId}/${fileName}`;
    
    return this.uploadFile(file, path, {
      userId,
      type: 'profile_image',
      uploadedAt: new Date().toISOString()
    });
  }
}

export const storageService = new StorageService();
