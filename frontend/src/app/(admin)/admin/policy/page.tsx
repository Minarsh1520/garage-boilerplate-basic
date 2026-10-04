'use client'

import { useState } from 'react'
import { FileUp, Check, X } from 'lucide-react'
import { uploadPolicyDocument } from '@/actions/policy.actions'

const MAX_FILE_SIZE = 500 * 1024

type UploadStatus = 'idle' | 'uploading' | 'success' | 'failed'

export default function PolicyPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')

  const validateFile = (file: File) => {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      setSelectedFile(null)
      setUploadStatus('idle')
      setError('Only PDF files are supported.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setUploadStatus('idle')
      setError('PDF must be 500 KB or smaller.')
      return
    }

    setSelectedFile(file)
    setUploadStatus('idle')
    setError(null)
  }

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (file) {
      validateFile(file)
    }
  }

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault()

    const file = event.dataTransfer.files?.[0]

    if (file) {
      validateFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadStatus('idle')
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      return
    }

    setUploadStatus('uploading')
    setError(null)

    try {
      const fileData = await readFileAsDataUrl(selectedFile)

      const result = await uploadPolicyDocument(
        selectedFile.name,
        selectedFile.type,
        selectedFile.size,
        fileData
      )

      if (result.success) {
        setUploadStatus('success')
      } else {
        setUploadStatus('failed')
      }
    } catch {
      setUploadStatus('failed')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">
        Policy
      </h1>

      <p className="mt-1 text-sm text-[#222222]">
        Provide approved documents for the AI assistant to use
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="flex min-h-52 w-full max-w-md flex-col items-center justify-center bg-gray-100 p-6 text-center"
        >
          <FileUp className="h-14 w-14 text-[#4361AB]" />

          <p className="mt-3 font-semibold text-[#222222]">
            Drag files here
          </p>

          <p className="text-sm text-gray-500">
            or
          </p>

          <label className="mt-3 cursor-pointer rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A]">
            Browse Files

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <p className="mt-2 text-xs text-gray-500">
            PDF files only, maximum 500 KB
          </p>
        </div>

        {/* File status area */}
        <div className="w-full max-w-md">
          <h2 className="text-sm font-bold text-[#222222]">
            Files uploaded
          </h2>

          {selectedFile ? (
            <div
              className={`mt-3 flex items-center justify-between rounded-lg border px-4 py-3 ${
                uploadStatus === 'success'
                  ? 'border-green-300 bg-green-100'
                  : uploadStatus === 'failed'
                    ? 'border-red-300 bg-red-100'
                    : 'border-gray-300 bg-white'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-[#222222]">
                  {selectedFile.name}
                </p>

                {uploadStatus === 'uploading' && (
                  <p className="text-xs text-gray-500">
                    Uploading...
                  </p>
                )}

                {uploadStatus === 'success' && (
                  <p className="text-xs text-green-700">
                    Upload successful
                  </p>
                )}

                {uploadStatus === 'failed' && (
                  <p className="text-xs text-red-600">
                    Upload failed
                  </p>
                )}
              </div>

              {uploadStatus === 'success' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : uploadStatus === 'failed' ? (
                <X className="h-5 w-5 text-red-600" />
              ) : (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-500">
              No file selected
            </div>
          )}

          {/* Validation feedback */}
          {error && (
            <p
              className="mt-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Upload button always stays visible */}
          <button
            type="button"
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              uploadStatus === 'uploading' ||
              uploadStatus === 'success'
            }
            className="mt-6 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadStatus === 'uploading'
              ? 'Uploading...'
              : uploadStatus === 'failed'
                ? 'Try Again'
                : 'Upload Files'}
          </button>
        </div>
      </div>
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}