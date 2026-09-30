import {mockCuratorService} from './mockServices'
import type {AuthService, CuratorService, MuseumItemsService} from '@/types/services'
import {supabaseAuthService} from './supabase/SupabaseAuthService'
import {supabaseMuseumItemsService} from './supabase/SupabaseMuseumItemsService'
import {supabaseAdminService} from './supabase/SupabaseAdminService'
export const authService: AuthService = supabaseAuthService
export const museumItemsService: MuseumItemsService = supabaseMuseumItemsService
export {supabaseAuthService, supabaseAdminService}
export const curatorService: CuratorService = mockCuratorService
