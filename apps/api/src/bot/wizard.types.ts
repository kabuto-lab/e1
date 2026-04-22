export type WizardStep =
  | 'name'
  | 'slug'
  | 'bio'
  | 'age'
  | 'height'
  | 'weight'
  | 'bust'
  | 'city'
  | 'rate_hourly'
  | 'rate_overnight'
  | 'photos'
  | 'confirm';

export interface WizardState {
  step: WizardStep;
  displayName?: string;
  slug?: string;
  biography?: string;
  age?: number;
  height?: number;
  weight?: number;
  bustSize?: string;
  city?: string;
  rateHourly?: number;
  rateOvernight?: number;
  photoFileIds: string[];
}
