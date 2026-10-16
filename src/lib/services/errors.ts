import i18n from '@/i18n'
import {AssetValidationError} from './supabase/assetValidation'
import {ExhibitValidationError} from './supabase/exhibitValidation'
export class AppError extends Error { key: string; constructor(key: string) { super(key); this.key = key } }
export function errorMessage(error: unknown): string {
  const validation=error instanceof ExhibitValidationError?error:error instanceof Error && error.cause instanceof ExhibitValidationError?error.cause:null
  if(validation)return i18n.t(`cms.validation.${validation.issues[0]?.key ?? 'required'}`,{ns:'admin'})
  if (error instanceof AppError || error instanceof AssetValidationError) return i18n.t(error.key, {ns: 'phase2'})
  if (error instanceof Error && error.cause instanceof AssetValidationError) return i18n.t(error.cause.key, {ns: 'phase2'})
  const value = error as {code?: string; message?: string; status?: number} | null
  let key = 'requestFailed'
  if (value?.code === '23503') key = 'referenced'
  else if (value?.code === '23505') key = 'duplicateSlug'
  else if (value?.code === '40001') key = 'conflict'
  else if (value?.code === '42501') key = 'unauthorized'
  else if (value?.code === 'invalid_credentials') key = 'invalidCredentials'
  else if (value?.code === 'email_not_confirmed') key = 'confirmEmail'
  else if (value?.code === 'weak_password') key = 'weakPassword'
  else if (value?.status === 429) key = 'rateLimit'
  else if (/fetch|network/i.test(value?.message ?? '')) key = 'networkError'
  return i18n.t(key, {ns: 'phase2'})
}
