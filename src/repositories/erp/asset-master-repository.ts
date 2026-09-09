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

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; defaultMeter: MeterReadingType }[] = [
  { id: 'HYVA', label: 'Hyva / Tipper / Dumper (हायवा)', defaultMeter: 'KILOMETERS' },
  { id: 'EXCAVATOR', label: 'Excavator / Poclain (पोकलेन)', defaultMeter: 'HOURS' },
  { id: 'TRANSIT_MIXER', label: 'Transit Mixer - TM (ट्रान्झिट मिक्सर)', defaultMeter: 'KILOMETERS' },
  { id: 'JCB', label: 'JCB / Backhoe Loader (जेसीबी)', defaultMeter: 'HOURS' },
  { id: 'ROLLER', label: 'Soil Compactor / Roller (रोलर)', defaultMeter: 'HOURS' },
  { id: 'CRANE', label: 'Crane - Hydra / Farana (क्रेन)', defaultMeter: 'HOURS' },
  { id: 'BOLERO_UTILITY', label: 'Bolero / Pickup / Site Vehicle (बोलेरो/पिकअप)', defaultMeter: 'KILOMETERS' },
  { id: 'BOWSER_TANKER', label: 'Diesel Bowser Tanker (डिझेल बाउझर)', defaultMeter: 'KILOMETERS' },
  { id: 'WATER_TANKER', label: 'Water Tanker (पाणी टँकर)', defaultMeter: 'KILOMETERS' },
  { id: 'GENERATOR', label: 'DG Set / Generator (जनरेटर)', defaultMeter: 'HOURS' },
  { id: 'MOTOR_GRADER', label: 'Motor Grader (मोटर ग्रेडर)', defaultMeter: 'HOURS' },
  { id: 'PAVER', label: 'Paver (पेव्हर)', defaultMeter: 'HOURS' },
  { id: 'DOZER', label: 'Crawler Dozer (डोझर)', defaultMeter: 'HOURS' },
  { id: 'WHEEL_LOADER', label: 'Wheel Loader (लोडर)', defaultMeter: 'HOURS' },
  { id: 'OTHER', label: 'Other Construction Equipment (इतर)', defaultMeter: 'HOURS' },
]

export interface AssetDocument {
  id: string
  title: string
  docType: 'RC' | 'INSURANCE' | 'FITNESS' | 'PUC' | 'PHOTO' | 'OTHER'
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
  vendorName?: string // joined or stored
  assetCategory: AssetCategory
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
   * Fetch all assets for organization with vendor details
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

      return (data || []).map((row) => ({
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
        meterType: (row.meter_type as MeterReadingType) || 'HOURS',
        currentMeterReading: Number(row.current_meter_reading ?? row.cumulative_hours ?? 0),
        fuelTankCapacity: Number(row.fuel_tank_capacity ?? 0),
        fuelIssueMode: (row.fuel_issue_mode as FuelIssueMode) || 'COMPANY_SUPPLIED',
        assignedSiteName: row.assigned_site_name || row.current_site || 'VTR Site',
        operatorName: row.operator_name,
        documentUrls: (row.document_urls as AssetDocument[]) || [],
        isActive: row.is_active ?? true,
        status: (row.status as 'ACTIVE' | 'INACTIVE') || (row.is_active ? 'ACTIVE' : 'INACTIVE'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } catch (err) {
      console.error('[AssetRepo] getAssets exception:', err)
      return []
    }
  },

  /**
   * Auto-generate next asset code (e.g. RC-HYVA-01, RC-EXC-02)
   */
  async generateNextAssetCode(
    organizationId: string,
    category: AssetCategory
  ): Promise<string> {
    const catCodeMap: Record<AssetCategory, string> = {
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
    const catPrefix = catCodeMap[category] || 'AST'

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
   * Create new machinery asset
   */
  async createAsset(params: {
    organizationId: string
    assetCode: string
    name: string
    ownershipType: AssetOwnershipType
    vendorId?: string
    assetCategory: AssetCategory
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
    assignedSiteName?: string
    operatorName?: string
    documentUrls?: AssetDocument[]
    isActive?: boolean
  }): Promise<{ asset: MachineryAssetRecord | null; error: string | null }> {
    try {
      const vNo = params.vehicleNumber.trim()
      if (!vNo) {
        return { asset: null, error: 'Vehicle / Equipment registration number is required.' }
      }

      // 1. Strict duplicate registration number validation
      const dupCheck = await this.isDuplicateVehicleNumber(params.organizationId, vNo)
      if (dupCheck.isDuplicate) {
        return {
          asset: null,
          error: `Duplicate Entry: Vehicle '${vNo.toUpperCase()}' is already registered under code '${dupCheck.existingAsset?.code}'. Duplicate registration numbers are strictly forbidden.`,
        }
      }

      const row = {
        organization_id: params.organizationId,
        asset_code: params.assetCode.trim().toUpperCase(),
        name: params.name.trim(),
        category: 'OTHER', // legacy enum fallback
        asset_category: params.assetCategory,
        ownership_type: params.ownershipType,
        vendor_id: params.ownershipType === 'CONTRACTOR_RENTAL' ? params.vendorId || null : null,
        vehicle_number: vNo.toUpperCase(),
        registration_number: vNo.toUpperCase(),
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
        document_urls: params.documentUrls || [],
        is_active: params.isActive ?? true,
        status: (params.isActive ?? true) ? 'ACTIVE' : 'INACTIVE',
      }

      const { data, error } = await supabase
        .from('machinery_assets')
        .insert(row)
        .select(`
          *,
          vendor:vendors(id, vendor_name, vendor_type)
        `)
        .single()

      if (error) {
        console.error('[AssetRepo] createAsset error:', error)
        if (error.code === '23505') {
          return { asset: null, error: `Vehicle registration number '${vNo}' or Asset Code already exists.` }
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
          assetCategory: (data.asset_category as AssetCategory) || 'OTHER',
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
          assignedSiteName: data.assigned_site_name || 'VTR Site',
          operatorName: data.operator_name,
          documentUrls: (data.document_urls as AssetDocument[]) || [],
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
      assetCategory: AssetCategory
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
      assignedSiteName?: string
      operatorName?: string
      documentUrls?: AssetDocument[]
      isActive?: boolean
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const vNo = params.vehicleNumber.trim()
      if (!vNo) {
        return { success: false, error: 'Vehicle / Equipment registration number is required.' }
      }

      // Check duplicate excluding self
      const dupCheck = await this.isDuplicateVehicleNumber(params.organizationId, vNo, id)
      if (dupCheck.isDuplicate) {
        return {
          success: false,
          error: `Another vehicle with registration '${vNo.toUpperCase()}' already exists (Asset Code: ${dupCheck.existingAsset?.code}).`,
        }
      }

      const updates = {
        name: params.name.trim(),
        asset_category: params.assetCategory,
        ownership_type: params.ownershipType,
        vendor_id: params.ownershipType === 'CONTRACTOR_RENTAL' ? params.vendorId || null : null,
        vehicle_number: vNo.toUpperCase(),
        registration_number: vNo.toUpperCase(),
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
        document_urls: params.documentUrls || [],
        is_active: params.isActive ?? true,
        status: (params.isActive ?? true) ? 'ACTIVE' : 'INACTIVE',
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('machinery_assets').update(updates).eq('id', id)
      if (error) return { success: false, error: error.message }

      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' }
    }
  },

  /**
   * Toggle asset status (Active / Inactive)
   * If Inactive, diesel filling is immediately blocked.
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
        // Fallback to base64 data URL
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

