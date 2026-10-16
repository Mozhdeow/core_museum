import {museumItemsService} from '@/lib/services'
import {createMuseumState} from './museumState'

export const useMuseumStore = createMuseumState(() => museumItemsService.catalog())