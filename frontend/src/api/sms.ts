import { api } from "../lib/api";
import type {
  AutomatedSmsRule,
  GuardianRecipient,
  SmsCampaign,
  SmsCampaignStatus,
  SmsCampaignType,
  SmsLog,
  SmsLogStatus,
  SmsTemplate,
  SmsTemplateType,
  SmsTriggerType,
} from "../types";

export const smsTemplatesApi = {
  list: (filters?: { type?: SmsTemplateType; isActive?: boolean }) =>
    api.get<SmsTemplate[]>("/sms-templates", filters as Record<string, string | boolean>),
  create: (payload: Partial<SmsTemplate>) => api.post<SmsTemplate>("/sms-templates", payload),
  update: (id: string, payload: Partial<SmsTemplate>) => api.put<SmsTemplate>(`/sms-templates/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/sms-templates/${id}`),
};

export const smsCampaignsApi = {
  list: (filters?: { status?: SmsCampaignStatus; type?: SmsCampaignType }) =>
    api.get<SmsCampaign[]>("/sms", filters as Record<string, string>),
  create: (payload: Partial<SmsCampaign>) => api.post<SmsCampaign>("/sms", payload),
  send: (id: string) => api.patch<SmsCampaign>(`/sms/${id}/send`),
  sendDirect: (recipients: { recipientId: string; recipientType: string; phoneNumber: string; message: string }[]) =>
    api.post<SmsLog[]>("/sms/send", { recipients }),
};

export const smsLogsApi = {
  list: (filters?: { campaignId?: string; status?: SmsLogStatus }) =>
    api.get<SmsLog[]>("/sms-logs", filters as Record<string, string>),
};

export const smsRecipientsApi = {
  grades: () => api.get<string[]>("/sms/grades"),
  guardians: () => api.get<GuardianRecipient[]>("/sms/guardians"),
  query: (params: { grade?: string; feeStatus?: string; allGuardians?: boolean }) =>
    api.post<GuardianRecipient[]>("/sms/query-recipients", params),
  sendTargeted: (payload: {
    recipients: { guardianId: string; phone: string; name: string; studentName?: string; studentId?: string }[];
    message: string;
    templateId?: string;
    campaignId?: string;
  }) => api.post("/sms/send-targeted", payload),
};

export const automatedRulesApi = {
  list: (filters?: { isActive?: boolean; triggerType?: SmsTriggerType }) =>
    api.get<AutomatedSmsRule[]>("/automated-rules", filters as Record<string, string | boolean>),
  create: (payload: Partial<AutomatedSmsRule>) => api.post<AutomatedSmsRule>("/automated-rules", payload),
  update: (id: string, payload: Partial<AutomatedSmsRule>) =>
    api.patch<AutomatedSmsRule>(`/automated-rules/${id}`, payload),
};
