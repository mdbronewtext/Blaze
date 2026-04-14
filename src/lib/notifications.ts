import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const sendNotification = async (userId: string, message: string, type: 'support' | 'system' | 'billing' = 'system', link?: string) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link: link || null
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
