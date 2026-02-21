export type CertificateType =
  | 'monitoria'
  | 'destaque'
  | 'evento_participacao'
  | 'evento_organizacao';

export type EventCertificateCategory = 'participacao' | 'organizacao';

export type CertificateReferenceType = 'subject' | 'area';

export interface CertificateDraftStudent {
  studentId: string;
  selected: boolean;
  textOverride?: string;
}
