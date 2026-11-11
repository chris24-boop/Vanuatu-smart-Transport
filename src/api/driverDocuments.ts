import { api } from './client';
import { DriverDocumentItem, DriverDocumentType } from '@/types/transport';

export async function listDriverDocumentsApi(): Promise<DriverDocumentItem[]> {
  const response = await api.get<DriverDocumentItem[]>('/driver/documents');
  return response.data;
}

export async function uploadDriverDocumentApi(input: {
  type: DriverDocumentType;
  filename: string;
  mimeType: string;
  contentBase64: string;
}): Promise<DriverDocumentItem> {
  const response = await api.post<DriverDocumentItem>('/driver/documents', input);
  return response.data;
}

