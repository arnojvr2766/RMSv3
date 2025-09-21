import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'system_admin' | 'standard_user';
  status: 'pending' | 'active' | 'disabled';
  createdAt: any;
  updatedAt: any;
  emailVerified: boolean;
  invitationToken?: string;
  invitationExpires?: any;
  lastLoginAt?: any;
  loginCount?: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: 'system_admin' | 'standard_user';
}

export interface InviteUserResponse {
  success: boolean;
  message: string;
  userId?: string;
}

class UserService {
  private collectionName = 'users';

  /**
   * Create a new user invitation
   */
  static async createUserInvitation(userData: CreateUserRequest): Promise<InviteUserResponse> {
    try {
      // Check if user already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', userData.email)
      );
      const existingUsers = await getDocs(existingUserQuery);
      
      if (!existingUsers.empty) {
        return {
          success: false,
          message: 'A user with this email already exists.'
        };
      }

      // Generate invitation token
      const invitationToken = UserService.generateInvitationToken();
      const invitationExpires = new Date();
      invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days expiry

      // Create user document
      const userRef = doc(collection(db, 'users'));
      const user: User = {
        id: userRef.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: false,
        invitationToken,
        invitationExpires: invitationExpires
      };

      await setDoc(userRef, user);

      // TODO: Send email verification
      await UserService.sendInvitationEmail(user, invitationToken);

      return {
        success: true,
        message: `Invitation sent to ${userData.email}. They will receive an email to set up their password.`,
        userId: userRef.id
      };

    } catch (error: any) {
      console.error('Error creating user invitation:', error);
      return {
        success: false,
        message: error.message || 'Failed to create user invitation.'
      };
    }
  }

  /**
   * Validate invitation token and return user data
   */
  static async validateInvitationToken(token: string): Promise<User | null> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('invitationToken', '==', token),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;
      
      // Check if token is expired
      if (userData.invitationExpires && userData.invitationExpires.toDate() < new Date()) {
        return null;
      }
      
      return {
        ...userData,
        id: userDoc.id
      };
    } catch (error) {
      console.error('Error validating invitation token:', error);
      return null;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const usersQuery = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(usersQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(userQuery);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as User;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: 'pending' | 'active' | 'disabled'): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Generate a secure invitation token
   */
  private static generateInvitationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Send invitation email via Firebase Functions
   */
  private static async sendInvitationEmail(user: User, token: string): Promise<void> {
    try {
      const invitationLink = `${window.location.origin}/setup-password?token=${token}`;
      
      // Call Firebase Function to send email
      const response = await fetch('https://us-central1-rmsv3-becf7.cloudfunctions.net/sendInvitationEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          invitationLink: invitationLink
        }),
      });

      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  }

  /**
   * Get all users in the system
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        } as User);
      });
      
      return users.sort((a, b) => {
        // Sort by creation date, newest first
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Update user's last login activity
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        loginCount: await this.incrementLoginCount(userId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Increment login count for a user
   */
  private static async incrementLoginCount(userId: string): Promise<number> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        return (userData.loginCount || 0) + 1;
      }
      
      return 1; // First login
    } catch (error) {
      console.error('Error getting login count:', error);
      return 1;
    }
  }

  /**
   * Update user status (active, disabled, etc.)
   */
  static async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

export { UserService };
export const userService = new UserService();
