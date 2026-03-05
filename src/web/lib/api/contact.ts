import apiClient from '../api-client';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactApi = {
  submit: (data: ContactFormData) =>
    apiClient.post('/Contact', data),
};