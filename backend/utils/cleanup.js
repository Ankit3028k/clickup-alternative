import TemporaryUser from '../models/TemporaryUser.js';
import OTP from '../models/OTP.js';

/**
 * Clean up expired temporary users and their associated OTPs
 * This function is called periodically to remove expired data
 */
export const cleanupExpiredData = async () => {
  try {
    console.log('Starting cleanup of expired data...');
    
    // Get all expired temporary users
    const expiredTempUsers = await TemporaryUser.find({
      expiresAt: { $lt: new Date() }
    });
    
    if (expiredTempUsers.length > 0) {
      console.log(`Found ${expiredTempUsers.length} expired temporary users`);
      
      // Extract emails for OTP cleanup
      const expiredEmails = expiredTempUsers.map(user => user.email);
      
      // Delete expired temporary users
      const deletedTempUsers = await TemporaryUser.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      // Delete associated OTPs for expired users
      const deletedOTPs = await OTP.deleteMany({
        email: { $in: expiredEmails },
        purpose: 'email_verification'
      });
      
      console.log(`Cleanup completed: ${deletedTempUsers.deletedCount} temporary users and ${deletedOTPs.deletedCount} OTPs removed`);
    } else {
      console.log('No expired temporary users found');
    }
    
    // Also clean up expired OTPs that might be orphaned
    const deletedOrphanedOTPs = await OTP.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    if (deletedOrphanedOTPs.deletedCount > 0) {
      console.log(`Removed ${deletedOrphanedOTPs.deletedCount} expired OTPs`);
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

/**
 * Clean up temporary users and OTPs for a specific email
 * Useful when registration fails or user wants to start over
 */
export const cleanupUserData = async (email) => {
  try {
    // Delete temporary user
    await TemporaryUser.deleteMany({ email });
    
    // Delete associated OTPs
    await OTP.deleteMany({ email, purpose: 'email_verification' });
    
    console.log(`Cleaned up data for email: ${email}`);
  } catch (error) {
    console.error(`Error cleaning up data for ${email}:`, error);
  }
};

/**
 * Initialize cleanup scheduler
 * Runs cleanup every hour
 */
export const initializeCleanupScheduler = () => {
  // Run cleanup immediately on startup
  cleanupExpiredData();
  
  // Schedule cleanup to run every hour (3600000 ms)
  setInterval(cleanupExpiredData, 3600000);
  
  console.log('Cleanup scheduler initialized - running every hour');
};
