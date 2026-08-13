import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface UserReport {
  id?: string;
  animeId: string;
  episodeId: string;
  animeTitle: string;
  episodeNumber: number;
  serverName: string;
  reason: string;
  timestamp?: any;
  status: "pending" | "resolved" | "dismissed";
  createdAt?: string;
}

/**
 * Sends a broken player report to Firestore collection `reports`
 */
export async function sendUserReport(report: Omit<UserReport, "id" | "status" | "createdAt">): Promise<boolean> {
  try {
    await addDoc(collection(db, "reports"), {
      ...report,
      status: "pending",
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error submitting user report to Firestore:", error);
    // Fallback: save to local storage for offline tolerance
    try {
      const existing = JSON.parse(localStorage.getItem("megaAnime_pending_reports") || "[]");
      existing.push({ ...report, status: "pending", createdAt: new Date().toISOString() });
      localStorage.setItem("megaAnime_pending_reports", JSON.stringify(existing));
    } catch (e) {}
    return true;
  }
}

/**
 * Fetches all pending reports from Firestore for the Admin Panel
 */
export async function fetchUserReports(): Promise<UserReport[]> {
  try {
    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    const reports: UserReport[] = [];
    snap.forEach((docSnap) => {
      reports.push({ id: docSnap.id, ...docSnap.data() } as UserReport);
    });
    return reports;
  } catch (error) {
    console.warn("Failed to fetch reports from Firestore, reading fallback storage:", error);
    try {
      const local = JSON.parse(localStorage.getItem("megaAnime_pending_reports") || "[]");
      return local;
    } catch (e) {
      return [];
    }
  }
}

/**
 * Updates a report status in Firestore (e.g. 'resolved' or 'dismissed')
 */
export async function updateReportStatus(reportId: string, status: "resolved" | "dismissed"): Promise<boolean> {
  try {
    const docRef = doc(db, "reports", reportId);
    await updateDoc(docRef, { status, resolvedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.warn("Error updating report status in Firestore:", error);
    return false;
  }
}
