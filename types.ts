export interface QRISData {
  payload: string;
  merchantName?: string;
  merchantCity?: string;
  globalId?: string;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  AMOUNT = 'AMOUNT',
  RESULT = 'RESULT',
}

export interface KeypadButton {
  label: string;
  value: number | string;
  type: 'number' | 'action' | 'preset';
}

export interface SavedQR {
  id: string;
  payload: string;
  merchantName: string;
  createdAt: number;
}
