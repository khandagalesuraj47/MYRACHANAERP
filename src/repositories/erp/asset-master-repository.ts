import { supabase } from '../../lib/supabase'

export type AssetOwnershipType = 'COMPANY_OWNED' | 'CONTRACTOR_RENTAL'
export type MeterReadingType = 'HOURS' | 'KILOMETERS'
export type FuelIssueMode = 'COMPANY_SUPPLIED' | 'DEBIT_TO_CONTRACTOR' | 'NOT_APPLICABLE'

export type AssetCategory =
  | 'HYVA'
  | 'EXCAVATOR'
  | 'TRANSIT_MIXER'
  | 'JCB'
  | 'ROLLER'
  | 'CRANE'
  | 'BOLERO_UTILITY'
  | 'BOWSER_TANKER'
  | 'WATER_TANKER'
  | 'GENERATOR'
  | 'MOTOR_GRADER'
  | 'PAVER'
  | 'DOZER'
  | 'WHEEL_LOADER'
  | 'OTHER'

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; defaultMeter: MeterReadingType; isDualEngineDefault?: boolean }[] = [
  { id: 'HYVA', label: 'Hyva / Tipper / Dumper', defaultMeter: 'KILOMETERS' },
  { id: 'EXCAVATOR', label: 'Excavator / Poclain', defaultMeter: 'HOURS' },
  { id: 'TRANSIT_MIXER', label: 'Transit Mixer (TM) - Dual Engine', defaultMeter: 'KILOMETERS', isDualEngineDefault: true },
  { id: 'JCB', label: 'JCB / Backhoe Loader', defaultMeter: 'HOURS' },
  { id: 'ROLLER', label: 'Soil Compactor / Roller', defaultMeter: 'HOURS' },
  { id: 'CRANE', label: 'Crane - Hydra / Farana', defaultMeter: 'HOURS' },
  { id: 'BOLERO_UTILITY', label: 'Bolero / Pickup / Site Vehicle', defaultMeter: 'KILOMETERS' },
  { id: 'BOWSER_TANKER', label: 'Diesel Bowser Tanker', defaultMeter: 'KILOMETERS' },
  { id: 'WATER_TANKER', label: 'Water Tanker', defaultMeter: 'KILOMETERS' },
  { id: 'GENERATOR', label: 'DG Set / Generator', defaultMeter: 'HOURS' },
  { id: 'MOTOR_GRADER', label: 'Motor Grader', defaultMeter: 'HOURS' },
  { id: 'PAVER', label: 'Asphalt / Concrete Paver', defaultMeter: 'HOURS' },
  { id: 'DOZER', label: 'Crawler Dozer', defaultMeter: 'HOURS' },
  { id: 'WHEEL_LOADER', label: 'Wheel Loader', defaultMeter: 'HOURS' },
  { id: 'OTHER', label: 'Other Construction Equipment', defaultMeter: 'HOURS' },
]

export interface AssetDocument {
  id: string
  title: string
  docType: 'RC' | 'INSURANCE' | 'FITNESS' | 'PUC' | 'PHOTO' | 'OTHER' | 'DUAL_ENGINE_META'
  fileUrl: string
  uploadedAt: string
}

export interface MachineryAssetRecord {
  id: string
  organizationId: string
  assetCode: string
  name: string
  ownershipType: AssetOwnershipType
  vendorId?: string
  vendorName?: string
  assetCategory: AssetCategory | string
  vehicleNumber: string
  make?: string
  model?: string
  chassisNumber?: string
  engineNumber?: string
  yearOfManufacture?: number
  meterType: MeterReadingType
  currentMeterReading: number
  fuelTankCapacity: number
  fuelIssueMode: FuelIssueMode

  // Standard Fuel Average Benchmark
  standardAverage: number
  standardAverageUnit: 'KM_PER_LITER' | 'LITERS_PER_HOUR'

  // Dual-Engine Support (e.g. Transit Mixer - TM)
  hasDualEngine: boolean
  secondaryEngineName?: string
  secondaryEngineNumber?: string
  secondaryMeterType: MeterReadingType
  secondaryMeterReading: number
  secondaryStandardAverage: number

  assignedSiteName: string
  operatorName?: string
  documentUrls: AssetDocument[]
  isActive: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'BREAKDOWN'
  createdAt: string
  updatedAt: string
}

export const AssetMasterRepository = {
  /**
   * Auto-format Indian Vehicle Registration Number
   * e.g. "mh04ab1234" -> "MH-04-AB-1234"
   * e.g. "mh041234" -> "MH-04-1234"
   */
  formatVehicleNumber(input: string): string {
    if (!input) return ''
    const clean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    // Match 2 Letters + 2 Digits + 1-3 Letters + 1-4 Digits (Standard Indian RTO)
    const matchFull = clean.match(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$/)
    if (matchFull) {
      return `${matchFull[1]}-${matchFull[2]}-${matchFull[3]}-${matchFull[4]}`
    }

    // Match 2 Letters + 2 Digits + 1-4 Digits (e.g. MH041234)
    const matchShort = clean.match(/^([A-Z]{2})(\d{2})(\d{1,4})$/)
    if (matchShort) {
      return `${matchShort[1]}-${matchShort[2]}-${matchShort[3]}`
    }

    // Default uppercase trimmed string
    return input.trim().toUpperCase()
  },

  /**
   * Normalize vehicle number for strict duplicate matching
   * e.g. "MH 04 AB 1234" -> "mh04ab1234"
   */
  normalizeVehicleNo(vNo: string): string {
    return vNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  },

  /**
   * Check if vehicle registration number already exists in organization
   */
  async isDuplicateVehicleNumber(
    organizationId: string,
    vehicleNumber: string,
    excludeId?: string
  ): Promise<{ isDuplicate: boolean; existingAsset?: { code: string; name: string } }> {
    try {
      const normalized = this.normalizeVehicleNo(vehicleNumber)
      if (!normalized) return { isDuplicate: false }

      let query = supabase
        .from('machinery_assets')
        .select('id, asset_code, name, vehicle_number')
        .eq('organization_id', organizationId)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query
      if (error || !data) return { isDuplicate: false }

      const match = data.find((a) => {
        const raw = a.vehicle_number || ''
        return this.normalizeVehicleNo(raw) === normalized
      })

      if (match) {
        return {
          isDuplicate: true,
          existingAsset: {
            code: match.asset_code,
            name: match.name || match.vehicle_number,
          },
        }
      }

      return { isDuplicate: false }
    } catch {
      return { isDuplicate: false }
    }
  },

  /**
   * Fetch all assets for organization with vendor details and dual engine metadata
   */
  async getAssets(organizationId: string): Promise<MachineryAssetRecord[]> {
    try {
      const { data, error } = await supabase
        .from('machinery_assets')
        .select(`
          *,
          vendor:vendors(id, vendor_name, vendor_type)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[AssetRepo] getAssets error:', error)
        return []
      }

      return (data || []).map((row) => {
        const docs = (row.document_urls as AssetDocument[]) || []
        // Check if dual engine meta is stored in document_urls fallback
        const metaDoc = docs.find((d) => d.docType === 'DUAL_ENGINE_META')
        let metaParsed: Record<string, unknown> = {}
        if (metaDoc) {
          try {
            metaParsed = JSON.parse(metaDoc.fileUrl)
          } catch {
            // Ignore parse error
          }
        }

        const meterType = (row.meter_type as MeterReadingType) || 'HOURS'
        const standardAverage = Number(row.standard_average ?? metaParsed.standardAverage ?? 0)
        const standardAverageUnit =
          (row.standard_average_unit as 'KM_PER_LITER' | 'LITERS_PER_HOUR') ||
          (metaParsed.standardAverageUnit as 'KM_PER_LITER' | 'LITERS_PER_HOUR') ||
          (meterType === 'KILOMETERS' ? 'KM_PER_LITER' : 'LITERS_PER_HOUR')

        const hasDualEngine = Boolean(row.has_dual_engine ?? metaParsed.hasDualEngine ?? false)
        const secondaryEngineName = (row.secondary_engine_name || metaParsed.secondaryEngineName) as string | undefined
        const secondaryEngineNumber = (row.secondary_engine_number || metaParsed.secondaryEngineNumber) as string | undefined
        const secondaryMeterType =
          ((row.secondary_meter_type || metaParsed.secondaryMeterType) as MeterReadingType) || 'HOURS'
        const secondaryMeterReading = Number(row.secondary_meter_reading ?? metaParsed.secondaryMeterReading ?? 0)
        const secondaryStandardAverage = Number(row.secondary_standard_average ?? metaParsed.secondaryStandardAverage ?? 0)

        return {
          id: row.id,
          organizationId: row.organization_id,
          assetCode: row.asset_code,
          name: row.name || row.vehicle_number || row.asset_code,
          ownershipType: (row.ownership_type as AssetOwnershipType) || 'COMPANY_OWNED',
          vendorId: row.vendor_id,
          vendorName: row.vendor?.vendor_name,
          assetCategory: (row.asset_category as AssetCategory) || (row.category as AssetCategory) || 'OTHER',
          vehicleNumber: row.vehicle_number || row.registration_number || '',
          make: row.make,
          model: row.model,
          chassisNumber: row.chassis_number,
          engineNumber: row.engine_number,
          yearOfManufacture: row.year_of_manufacture,
          meterType,
          currentMeterReading: Number(row.current_meter_reading ?? row.cumulative_hours ?? 0),
          fuelTankCapacity: Number(row.fuel_tank_capacity ?? 0),
          fuelIssueMode: (row.fuel_issue_mode as FuelIssueMode) || 'COMPANY_SUPPLIED',

          standardAverage,
          standardAverageUnit,

          hasDualEngine,
          secondaryEngineName,
          secondaryEngineNumber,
          secondaryMeterType,
          secondaryMeterReading,
          secondaryStandardAverage,

          assignedSiteName: row.assigned_site_name || row.current_site || 'VTR Site',
          operatorName: row.operator_name,
          documentUrls: docs.filter((d) => d.docType !== 'DUAL_ENGINE_META'),
          isActive: row.is_active ?? true,
          status: (row.status as 'ACTIVE' | 'INACTIVE') || (row.is_active ? 'ACTIVE' : 'INACTIVE'),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      })
    } catch (err) {
      console.error('[AssetRepo] getAssets exception:', err)
      return []
    }
  },

  /**
   * Auto-generate next asset code (e.g. RC-HYV-001, RC-EXC-002)
   */
  async generateNextAssetCode(
    organizationId: string,
    categoryCode: string
  ): Promise<string> {
    const catCodeMap: Record<string, string> = {
      HYVA: 'HYV',
      EXCAVATOR: 'EXC',
      TRANSIT_MIXER: 'TM',
      JCB: 'JCB',
      ROLLER: 'ROL',
      CRANE: 'CRN',
      BOLERO_UTILITY: 'UTL',
      BOWSER_TANKER: 'BWS',
      WATER_TANKER: 'WTK',
      GENERATOR: 'GEN',
      MOTOR_GRADER: 'MGD',
      PAVER: 'PVR',
      DOZER: 'DZR',
      WHEEL_LOADER: 'LDR',
      OTHER: 'AST',
    }
    const catPrefix = catCodeMap[categoryCode] || categoryCode.slice(0, 3).toUpperCase() || 'AST'

    try {
      const { count } = await supabase
        .from('machinery_assets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      const seq = (count || 0) + 1
      return `RC-${catPrefix}-${String(seq).padStart(3, '0')}`
    } catch {
      return `RC-${catPrefix}-${Math.floor(100 + Math.random() * 900)}`
    }
  },

  /**
   * Create new machinery asset with dual engine and benchmark average support
   */
  async createAsset(params: {
    organizationId: string
    assetCode: string
    name: string
    ownershipType: AssetOwnershipType
    vendorId?: string
    assetCategory: string
    vehicleNumber: string
    make?: string
    model?: string
    chassisNumber?: string
    engineNumber?: string
    yearOfManufacture?: number
    meterType: MeterReadingType
    currentMeterReading?: number
    fuelTankCapacity?: number
    fuelIssueMode: FuelIssueMode

    // Standard Fuel Benchmark
    standardAverage?: number
    standardAverageUnit?: 'KM_PER_LITER' | 'LITERS_PER_HOUR'

    // Dual Engine Specs
    hasDualEngine?: boolean
    secondaryEngineName?: string
    secondaryEngineNumber?: string
    secondaryMeterType?: MeterReadingType
    secondaryMeterReading?: number
    secondaryStandardAverage?: number

    assignedSiteName?: string
    operatorName?: string
    documentUrls?: AssetDocument[]
    isActive?: boolean
  }): Promise<{ asset: MachineryAssetRecord | null; error: string | null }> {
    try {
      const formattedVehicleNo = this.formatVehicleNumber(params.vehicleNumber)
      if (!formattedVehicleNo) {
        return { asset: null, error: 'Vehicle / Equipment registration number is required.' }
      }

      // 1. Strict duplicate registration number validation
      const dupCheck = await this.isDuplicateVehicleNumber(params.organizationId, formattedVehicleNo)
      if (dupCheck.isDuplicate) {
        return {
          asset: null,
          error: `Duplicate Entry: Vehicle '${formattedVehicleNo}' is already registered under code '${dupCheck.existingAsset?.code}'. Duplicate registration numbers are strictly forbidden.`,
        }
      }

      // Prepare metadata fallback in document_urls
      const docs: AssetDocument[] = [...(params.documentUrls || [])]
      const metaPayload = {
        standardAverage: params.standardAverage || 0,
        standardAverageUnit: params.standardAverageUnit || (params.meterType === 'KILOMETERS' ? 'KM_PER_LITER' : 'LITERS_PER_HOUR'),
        hasDualEngine: Boolean(params.hasDualEngine),
        secondaryEngineName: params.secondaryEngineName || '',
        secondaryEngineNumber: params.secondaryEngineNumber || '',
        secondaryMeterType: params.secondaryMeterType || 'HOURS',
        secondaryMeterReading: params.secondaryMeterReading || 0,
        secondaryStandardAverage: params.secondaryStandardAverage || 0,
      }

      docs.push({
        id: `meta-${Date.now()}`,
        title: 'Dual Engine & Benchmark Metadata',
        docType: 'DUAL_ENGINE_META',
        fileUrl: JSON.stringify(metaPayload),
        uploadedAt: new Date().toISOString(),
      })

      const baseRow: Record<string, unknown> = {
        organization_id: params.organizationId,
        asset_code: params.assetCode.trim().toUpperCase(),
        name: params.name.trim(),
        category: 'OTHER',
        asset_category: params.assetCategory,
        ownership_type: params.ownershipType,
        vendor_id: params.ownershipType === 'CONTRACTOR_RENTAL' ? params.vendorId || null : null,
        vehicle_number: formattedVehicleNo,
        registration_number: formattedVehicleNo,
        make: params.make?.trim() || null,
        model: params.model?.trim() || null,
        chassis_number: params.chassisNumber?.trim() || null,
        engine_number: params.engineNumber?.trim() || null,
        year_of_manufacture: params.yearOfManufacture || null,
        meter_type: params.meterType,
        current_meter_reading: params.currentMeterReading || 0,
        cumulative_hours: params.currentMeterReading || 0,
        fuel_tank_capacity: params.fuelTankCapacity || 0,
        fuel_issue_mode: params.fuelIssueMode,
        assigned_site_name: params.assignedSiteName?.trim() || 'VTR Site',
        current_site: params.assignedSiteName?.trim() || 'VTR Site',
        operator_name: params.operatorName?.trim() || null,
        document_urls: docs,
        is_active: params.isActive ?? true,
        status: (params.isActive ?? true) ? 'ACTIVE' : 'INACTIVE',
      }

      // Try inserting with extended columns first
      const extendedRow = {
        ...baseRow,
        standard_average: params.standardAverage || 0,
        standard_average_unit: metaPayload.standardAverageUnit,
        has_dual_engine: Boolean(params.hasDualEngine),
        secondary_engine_name: params.secondaryEngineName?.trim() || null,
        secondary_engine_number: params.secondaryEngineNumber?.trim() || null,
        secondary_meter_type: params.secondaryMeterType || 'HOURS',
        secondary_meter_reading: params.secondaryMeterReading || 0,
        secondary_standard_average: params.secondaryStandardAverage || 0,
      }

      let { data, error } = await supabase
        .from('machinery_assets')
        .insert(extendedRow)
        .select(`*, vendor:vendors(id, vendor_name, vendor_type)`)
        .single()

      // If extended columns are not yet added in Supabase schema cache, retry with baseRow
      if (error && error.code === '42703') {
        const retry = await supabase
          .from('machinery_assets')
          .insert(baseRow)
          .select(`*, vendor:vendors(id, vendor_name, vendor_type)`)
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error('[AssetRepo] createAsset error:', error)
        if (error.code === '23505') {
          return { asset: null, error: `Vehicle registration number '${formattedVehicleNo}' already exists.` }
        }
        return { asset: null, error: error.message }
      }

      return {
        asset: {
          id: data.id,
          organizationId: data.organization_id,
          assetCode: data.asset_code,
          name: data.name,
          ownershipType: data.ownership_type as AssetOwnershipType,
          vendorId: data.vendor_id,
          vendorName: data.vendor?.vendor_name,
          assetCategory: data.asset_category || 'OTHER',
          vehicleNumber: data.vehicle_number,
          make: data.make,
          model: data.model,
          chassisNumber: data.chassis_number,
          engineNumber: data.engine_number,
          yearOfManufacture: data.year_of_manufacture,
          meterType: data.meter_type as MeterReadingType,
          currentMeterReading: Number(data.current_meter_reading || 0),
          fuelTankCapacity: Number(data.fuel_tank_capacity || 0),
          fuelIssueMode: data.fuel_issue_mode as FuelIssueMode,

          standardAverage: Number(data.standard_average ?? metaPayload.standardAverage),
          standardAverageUnit: (data.standard_average_unit ?? metaPayload.standardAverageUnit) as 'KM_PER_LITER' | 'LITERS_PER_HOUR',
          hasDualEngine: Boolean(data.has_dual_engine ?? metaPayload.hasDualEngine),
          secondaryEngineName: data.secondary_engine_name ?? metaPayload.secondaryEngineName,
          secondaryEngineNumber: data.secondary_engine_number ?? metaPayload.secondaryEngineNumber,
          secondaryMeterType: (data.secondary_meter_type ?? metaPayload.secondaryMeterType) as MeterReadingType,
          secondaryMeterReading: Number(data.secondary_meter_reading ?? metaPayload.secondaryMeterReading),
          secondaryStandardAverage: Number(data.secondary_standard_average ?? metaPayload.secondaryStandardAverage),

          assignedSiteName: data.assigned_site_name || 'VTR Site',
          operatorName: data.operator_name,
          documentUrls: (data.document_urls as AssetDocument[]).filter((d) => d.docType !== 'DUAL_ENGINE_META'),
          isActive: data.is_active,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register asset'
      return { asset: null, error: msg }
    }
  },

  /**
   * Update existing machinery asset
   */
  async updateAsset(
    id: string,
    params: {
      organizationId: string
      name: string
      ownershipType: AssetOwnershipType
      vendorId?: string
      assetCategory: string
      vehicleNumber: string
      make?: string
      model?: string
      chassisNumber?: string
      engineNumber?: string
      yearOfManufacture?: number
      meterType: MeterReadingType
      currentMeterReading?: number
      fuelTankCapacity?: number
      fuelIssueMode: FuelIssueMode

      // Standard Fuel Benchmark
      standardAverage?: number
      standardAverageUnit?: 'KM_PER_LITER' | 'LITERS_PER_HOUR'

      // Dual Engine Specs
      hasDualEngine?: boolean
      secondaryEngineName?: string
      secondaryEngineNumber?: string
      secondaryMeterType?: MeterReadingType
      secondaryMeterReading?: number
      secondaryStandardAverage?: number

      assignedSiteName?: string
      operatorName?: string
      documentUrls?: AssetDocument[]
      isActive?: boolean
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const formattedVehicleNo = this.formatVehicleNumber(params.vehicleNumber)
      if (!formattedVehicleNo) {
        return { success: false, error: 'Vehicle / Equipment registration number is required.' }
      }

      // Check duplicate excluding self
      const dupCheck = await this.isDuplicateVehicleNumber(params.organizationId, formattedVehicleNo, id)
      if (dupCheck.isDuplicate) {
        return {
          success: false,
          error: `Another vehicle with registration '${formattedVehicleNo}' already exists (Asset Code: ${dupCheck.existingAsset?.code}).`,
        }
      }

      const docs: AssetDocument[] = (params.documentUrls || []).filter((d) => d.docType !== 'DUAL_ENGINE_META')
      const metaPayload = {
        standardAverage: params.standardAverage || 0,
        standardAverageUnit: params.standardAverageUnit || (params.meterType === 'KILOMETERS' ? 'KM_PER_LITER' : 'LITERS_PER_HOUR'),
        hasDualEngine: Boolean(params.hasDualEngine),
        secondaryEngineName: params.secondaryEngineName || '',
        secondaryEngineNumber: params.secondaryEngineNumber || '',
        secondaryMeterType: params.secondaryMeterType || 'HOURS',
        secondaryMeterReading: params.secondaryMeterReading || 0,
        secondaryStandardAverage: params.secondaryStandardAverage || 0,
      }

      docs.push({
        id: `meta-${Date.now()}`,
        title: 'Dual Engine & Benchmark Metadata',
        docType: 'DUAL_ENGINE_META',
        fileUrl: JSON.stringify(metaPayload),
        uploadedAt: new Date().toISOString(),
      })

      const baseUpdates: Record<string, unknown> = {
        name: params.name.trim(),
        asset_category: params.assetCategory,
        ownership_type: params.ownershipType,
        vendor_id: params.ownershipType === 'CONTRACTOR_RENTAL' ? params.vendorId || null : null,
        vehicle_number: formattedVehicleNo,
        registration_number: formattedVehicleNo,
        make: params.make?.trim() || null,
        model: params.model?.trim() || null,
        chassis_number: params.chassisNumber?.trim() || null,
        engine_number: params.engineNumber?.trim() || null,
        year_of_manufacture: params.yearOfManufacture || null,
        meter_type: params.meterType,
        current_meter_reading: params.currentMeterReading || 0,
        cumulative_hours: params.currentMeterReading || 0,
        fuel_tank_capacity: params.fuelTankCapacity || 0,
        fuel_issue_mode: params.fuelIssueMode,
        assigned_site_name: params.assignedSiteName?.trim() || 'VTR Site',
        current_site: params.assignedSiteName?.trim() || 'VTR Site',
        operator_name: params.operatorName?.trim() || null,
        document_urls: docs,
        is_active: params.isActive ?? true,
        status: (params.isActive ?? true) ? 'ACTIVE' : 'INACTIVE',
        updated_at: new Date().toISOString(),
      }

      const extendedUpdates = {
        ...baseUpdates,
        standard_average: params.standardAverage || 0,
        standard_average_unit: metaPayload.standardAverageUnit,
        has_dual_engine: Boolean(params.hasDualEngine),
        secondary_engine_name: params.secondaryEngineName?.trim() || null,
        secondary_engine_number: params.secondaryEngineNumber?.trim() || null,
        secondary_meter_type: params.secondaryMeterType || 'HOURS',
        secondary_meter_reading: params.secondaryMeterReading || 0,
        secondary_standard_average: params.secondaryStandardAverage || 0,
      }

      let { error } = await supabase.from('machinery_assets').update(extendedUpdates).eq('id', id)

      if (error && error.code === '42703') {
        const retry = await supabase.from('machinery_assets').update(baseUpdates).eq('id', id)
        error = retry.error
      }

      if (error) return { success: false, error: error.message }

      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' }
    }
  },

  /**
   * Toggle asset status (Active / Inactive)
   */
  async toggleStatus(id: string, isActive: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('machinery_assets')
        .update({
          is_active: isActive,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Status update failed' }
    }
  },

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('machinery_assets').delete().eq('id', id)
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete failed' }
    }
  },

  /**
   * Upload asset document/photo to Supabase Storage
   */
  async uploadDocument(
    file: File,
    assetCode: string,
    docType: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const cleanFileName = `asset-docs/${assetCode}_${docType}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('apk-releases')
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        const reader = new FileReader()
        return new Promise((resolve) => {
          reader.onloadend = () => {
            resolve({ url: reader.result as string, error: null })
          }
          reader.readAsDataURL(file)
        })
      }

      const { data } = supabase.storage
        .from('apk-releases')
        .getPublicUrl(cleanFileName)

      return { url: data.publicUrl, error: null }
    } catch (err: unknown) {
      return { url: null, error: err instanceof Error ? err.message : 'Upload failed' }
    }
  },
}
