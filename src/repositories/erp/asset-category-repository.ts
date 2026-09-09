import { supabase } from '../../lib/supabase'
import type { MeterReadingType } from './asset-master-repository'

export interface AssetCategoryItem {
  id: string
  code: string
  name: string
  defaultMeterType: MeterReadingType
  isDualEngineDefault: boolean
  defaultStandardAverage: number
  defaultAverageUnit: 'KM_PER_LITER' | 'LITERS_PER_HOUR'
  isCustom?: boolean
}

export const DEFAULT_ASSET_CATEGORIES: AssetCategoryItem[] = [
  {
    id: 'cat-hyva',
    code: 'HYVA',
    name: 'Hyva / Tipper / Dumper',
    defaultMeterType: 'KILOMETERS',
    isDualEngineDefault: false,
    defaultStandardAverage: 2.8,
    defaultAverageUnit: 'KM_PER_LITER',
  },
  {
    id: 'cat-excavator',
    code: 'EXCAVATOR',
    name: 'Excavator / Poclain',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 18.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-transit-mixer',
    code: 'TRANSIT_MIXER',
    name: 'Transit Mixer (TM) - Dual Engine',
    defaultMeterType: 'KILOMETERS',
    isDualEngineDefault: true,
    defaultStandardAverage: 2.5,
    defaultAverageUnit: 'KM_PER_LITER',
  },
  {
    id: 'cat-jcb',
    code: 'JCB',
    name: 'JCB / Backhoe Loader',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 4.5,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-roller',
    code: 'ROLLER',
    name: 'Soil Compactor / Roller',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 6.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-crane',
    code: 'CRANE',
    name: 'Crane (Hydra / Farana / Mobile)',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 7.5,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-bolero',
    code: 'BOLERO_UTILITY',
    name: 'Bolero / Pickup / Site Vehicle',
    defaultMeterType: 'KILOMETERS',
    isDualEngineDefault: false,
    defaultStandardAverage: 10.0,
    defaultAverageUnit: 'KM_PER_LITER',
  },
  {
    id: 'cat-bowser',
    code: 'BOWSER_TANKER',
    name: 'Diesel Bowser Tanker',
    defaultMeterType: 'KILOMETERS',
    isDualEngineDefault: false,
    defaultStandardAverage: 3.5,
    defaultAverageUnit: 'KM_PER_LITER',
  },
  {
    id: 'cat-water-tanker',
    code: 'WATER_TANKER',
    name: 'Water Tanker',
    defaultMeterType: 'KILOMETERS',
    isDualEngineDefault: false,
    defaultStandardAverage: 3.2,
    defaultAverageUnit: 'KM_PER_LITER',
  },
  {
    id: 'cat-generator',
    code: 'GENERATOR',
    name: 'DG Set / Generator',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 8.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-grader',
    code: 'MOTOR_GRADER',
    name: 'Motor Grader',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 14.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-paver',
    code: 'PAVER',
    name: 'Asphalt / Concrete Paver',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 12.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-dozer',
    code: 'DOZER',
    name: 'Crawler Dozer',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 16.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
  {
    id: 'cat-loader',
    code: 'WHEEL_LOADER',
    name: 'Wheel Loader',
    defaultMeterType: 'HOURS',
    isDualEngineDefault: false,
    defaultStandardAverage: 10.0,
    defaultAverageUnit: 'LITERS_PER_HOUR',
  },
]

const LOCAL_STORAGE_KEY_PREFIX = 'myrachana_custom_categories_'

export const AssetCategoryRepository = {
  /**
   * Get all categories (Pre-seeded + Custom from Supabase/localStorage)
   */
  async getCategories(organizationId: string): Promise<AssetCategoryItem[]> {
    const list: AssetCategoryItem[] = [...DEFAULT_ASSET_CATEGORIES]

    // 1. Try fetching from Supabase table
    try {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (!error && data && data.length > 0) {
        data.forEach((row) => {
          if (!list.some((c) => c.code === row.code)) {
            list.push({
              id: row.id,
              code: row.code,
              name: row.name,
              defaultMeterType: row.default_meter_type as MeterReadingType,
              isDualEngineDefault: row.is_dual_engine_default ?? false,
              defaultStandardAverage: Number(row.default_standard_average || 0),
              defaultAverageUnit: row.default_average_unit || 'KM_PER_LITER',
              isCustom: true,
            })
          }
        })
        return list
      }
    } catch {
      // Fall through to local storage
    }

    // 2. Fallback to LocalStorage
    try {
      const localStr = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${organizationId}`)
      if (localStr) {
        const customCats: AssetCategoryItem[] = JSON.parse(localStr)
        customCats.forEach((c) => {
          if (!list.some((existing) => existing.code === c.code)) {
            list.push({ ...c, isCustom: true })
          }
        })
      }
    } catch {
      // Ignore local storage error
    }

    return list
  },

  /**
   * Add a new custom category (persisted in Supabase + localStorage)
   */
  async addCategory(params: {
    organizationId: string
    name: string
    defaultMeterType: MeterReadingType
    isDualEngineDefault: boolean
    defaultStandardAverage?: number
    defaultAverageUnit?: 'KM_PER_LITER' | 'LITERS_PER_HOUR'
  }): Promise<{ category: AssetCategoryItem | null; error: string | null }> {
    try {
      const trimmedName = params.name.trim()
      if (!trimmedName) {
        return { category: null, error: 'Category name is required.' }
      }

      // Generate unique alphanumeric code
      const generatedCode =
        'CAT_' +
        trimmedName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 16) +
        '_' +
        Math.floor(100 + Math.random() * 900)

      const newCat: AssetCategoryItem = {
        id: `cat-${Date.now()}`,
        code: generatedCode,
        name: trimmedName,
        defaultMeterType: params.defaultMeterType,
        isDualEngineDefault: params.isDualEngineDefault,
        defaultStandardAverage: params.defaultStandardAverage || 0,
        defaultAverageUnit:
          params.defaultAverageUnit ||
          (params.defaultMeterType === 'KILOMETERS' ? 'KM_PER_LITER' : 'LITERS_PER_HOUR'),
        isCustom: true,
      }

      // 1. Persist to Supabase if table exists
      try {
        await supabase.from('asset_categories').insert({
          organization_id: params.organizationId,
          code: newCat.code,
          name: newCat.name,
          default_meter_type: newCat.defaultMeterType,
          is_dual_engine_default: newCat.isDualEngineDefault,
          default_standard_average: newCat.defaultStandardAverage,
          default_average_unit: newCat.defaultAverageUnit,
        })
      } catch {
        // Continue to localStorage persistence
      }

      // 2. Persist to localStorage
      try {
        const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${params.organizationId}`
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as AssetCategoryItem[]
        existing.push(newCat)
        localStorage.setItem(storageKey, JSON.stringify(existing))
      } catch {
        // Ignore local storage error
      }

      return { category: newCat, error: null }
    } catch (err) {
      return { category: null, error: err instanceof Error ? err.message : 'Failed to add category' }
    }
  },
}
