import { API_BASE_URL, ApiError, newIdempotencyKey, request, type PageMeta } from '../../../services/api-client';

/* GET /student-registrations item (masked; backend students/register/student.service.ts publicStudent). */
export interface Registration {
  id: string;
  code: string;
  name: string;
  centreCode: string | null;
  centreName: string | null;
  trackCode: string | null;
  trackName: string | null;
  status: string;
  mobile: string | null;
  email: string | null;
  aadhaar: string | null;
  createdAt: string;
}

export interface RegistrationDetail extends Registration {
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string | null;
  religion: string;
  caste: string;
  educationQualification: string;
  trackSourceValue: string;
  declarationAccepted: boolean | null;
  documents: { key: string; label: string; required: boolean; supplied: boolean; barcode: string | null }[];
  files: { id: string; docType: string; originalName: string; mimeType: string; sizeBytes: number; uploadedAt: string }[];
}

export interface RegistrationListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: 'createdAt' | 'code' | 'firstName';
  sortOrder?: 'ASC' | 'DESC';
}

/* The registration JSON sent in the "data" field (backend registration-admin.validation.ts). */
export interface RegistrationData {
  first_name: string;
  last_name: string;
  father_name: string;
  mother_name: string;
  email: string;
  date_of_birth: string;
  current_address: string;
  aadhaar_number: string;
  mobile_number: string;
  religion: string;
  caste_id: string;
  region_id: string;
  technology: string;
  education_id: string;
  declaration_accepted: true;
  barcodes?: Record<string, string>;
}

/* Student Registration endpoints (backend /api/v1/student-registrations). */
export const registrationApi = {
  async list(params: RegistrationListParams, signal?: AbortSignal): Promise<{ items: Registration[]; meta: PageMeta }> {
    const { data, meta } = await request<Registration[]>('/student-registrations', { query: { ...params }, signal });
    return { items: data, meta: meta ?? { page: 1, limit: params.limit, total: data.length, totalPages: 1 } };
  },

  async get(id: string): Promise<RegistrationDetail> {
    return (await request<RegistrationDetail>(`/student-registrations/${id}`)).data;
  },

  /* One uploaded file as a Blob (sent with the session cookie), for in-page preview. */
  async fileBlob(id: string, documentId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/student-registrations/${id}/documents/${documentId}/file`, { credentials: 'include' });
    if (!res.ok) throw new ApiError(`Could not load the file (${res.status})`, res.status, 'FILE_ERROR');
    return res.blob();
  },

  /* Multipart: "data" = JSON, one file per document type code. The idempotency key makes a retried submit safe. */
  async create(
    data: RegistrationData,
    files: Record<string, File>,
    idempotencyKey = newIdempotencyKey(),
  ): Promise<{ id: string; registration_id: string; status: string }> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(data));
    for (const [code, file] of Object.entries(files)) fd.append(code, file, file.name);
    return (
      await request<{ id: string; registration_id: string; status: string }>('/student-registrations/admin', {
        method: 'POST',
        body: fd,
        idempotencyKey,
      })
    ).data;
  },
};
