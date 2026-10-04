'use server'

import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/actions/auth.actions'

const MAX_FILE_SIZE = 500 * 1024

type UploadPolicyResult = {
  success: boolean
  error?: string
}

export async function uploadPolicyDocument(
  fileName: string,
  fileType: string,
  fileSize: number,
  fileData: string
): Promise<UploadPolicyResult> {
  try {
    const session = await requireAdmin()

    if (!fileName || !fileData) {
      return {
        success: false,
        error: 'No file was provided.',
      }
    }

    if (fileType !== 'application/pdf' && !fileName.toLowerCase().endsWith('.pdf')) {
      return {
        success: false,
        error: 'Only PDF files are supported.',
      }
    }

    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'PDF must be 500 KB or smaller.',
      }
    }
    
    await adminDb.collection('policyDocuments').add({
      fileName,
      fileType,
      fileSize,
      fileData,
      uploadedBy: session.uid,
      uploadedAt: new Date(),
    })

    return {
      success: true,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to upload policy document.',
    }
  }
}