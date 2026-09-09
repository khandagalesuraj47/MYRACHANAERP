import { supabase } from '../../lib/supabase'
import { StorageService } from '../../lib/storage-service'

export type VendorType = 'PURCHASE_VENDOR' | 'CONTRACTOR_VENDOR'
export type DocumentType = 'AADHAAR' | 'PAN' | 'GST' | 'CHEQUE' | 'CONTRACT' | 'OTHER'

export interface VendorDocument {
  id: string
  documentType: DocumentType
  documentName: string
  fileUrl: string
  uploadedAt: string
}

export interface Vendor {
  id: string
  organizationId: string
  vendorCode: string
  vendorName: string
  vendorType: VendorType
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string

  // Contractor Terms (Optional)
  gstNumber?: string
  panNumber?: string
  aadhaarNumber?: string
  tdsPercentage: number
  securityDepositAmount: number
  paymentTerms?: string

  // Bank Details (Optional)
  bankName?: string
  accountHolderName?: string
  accountNumber?: string
  ifscCode?: string
  branchName?: string

  // Documents
  documents: VendorDocument[]

  // Status
  isActive: boolean
  status: 'ACTIVE' | 'INACTIVE'
  notes?: string

  createdAt: string
  updatedAt: string
}

export const VendorRepository = {
  /**
   * Fetch all vendors for an organization (optionally filtered by type)
   */
  async getVendors(organizationId: string, vendorType?: VendorType): Promise<Vendor[]> {
    try {
      let query = supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', organizationId)
        .order('vendor_name', { ascending: true })

      if (vendorType) {
        query = query.eq('vendor_type', vendorType)
      }

      const { data, error } = await query

      if (error) {
        console.error('[VendorRepo] getVendors error:', error)
        return []
      }

      return (data || []).map((v) => ({
        id: v.id,
        organizationId: v.organization_id,
        vendorCode: v.vendor_code,
        vendorName: v.vendor_name,
        vendorType: v.vendor_type as VendorType,
        contactPerson: v.contact_person,
        phone: v.phone,
        email: v.email,
        address: v.address,
        city: v.city,
        state: v.state,
        gstNumber: v.gst_number,
        panNumber: v.pan_number,
        aadhaarNumber: v.aadhaar_number,
        tdsPercentage: Number(v.tds_percentage || 0),
        securityDepositAmount: Number(v.security_deposit_amount || 0),
        paymentTerms: v.payment_terms,
        bankName: v.bank_name,
        accountHolderName: v.account_holder_name,
        accountNumber: v.account_number,
        ifscCode: v.ifsc_code,
        branchName: v.branch_name,
        documents: (v.documents as VendorDocument[]) || [],
        isActive: v.is_active ?? true,
        status: (v.status as 'ACTIVE' | 'INACTIVE') || (v.is_active ? 'ACTIVE' : 'INACTIVE'),
        notes: v.notes,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      }))
    } catch (err) {
      console.error('[VendorRepo] getVendors exception:', err)
      return []
    }
  },

  /**
   * Field Format Validators with Suggestions
   */
  validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone?.trim()) return { valid: true }
    const clean = phone.replace(/[^0-9]/g, '')
    if (clean.length !== 10) {
      return { valid: false, error: 'Mobile number must be exactly 10 digits (e.g. 9876543210).' }
    }
    if (!/^[6-9]/.test(clean)) {
      return { valid: false, error: 'Mobile number must start with 6, 7, 8, or 9.' }
    }
    return { valid: true }
  },

  validatePan(pan: string): { valid: boolean; error?: string } {
    if (!pan?.trim()) return { valid: true }
    const clean = pan.trim().toUpperCase()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
      return { valid: false, error: 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).' }
    }
    return { valid: true }
  },

  validateGst(gst: string): { valid: boolean; error?: string } {
    if (!gst?.trim()) return { valid: true }
    const clean = gst.trim().toUpperCase()
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean)) {
      return { valid: false, error: 'Invalid GSTIN format. 15 characters required (e.g. 27ABCDE1234F1Z5).' }
    }
    return { valid: true }
  },

  validateAadhaar(aadhaar: string): { valid: boolean; error?: string } {
    if (!aadhaar?.trim()) return { valid: true }
    const clean = aadhaar.replace(/[^0-9]/g, '')
    if (clean.length !== 12) {
      return { valid: false, error: 'Aadhaar number must be exactly 12 digits (e.g. 1234 5678 9012).' }
    }
    return { valid: true }
  },

  validateIfsc(ifsc: string): { valid: boolean; error?: string } {
    if (!ifsc?.trim()) return { valid: true }
    const clean = ifsc.trim().toUpperCase()
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
      return { valid: false, error: 'Invalid IFSC format. 5th character must be zero "0" (e.g. HDFC0001234, SBIN0004567).' }
    }
    return { valid: true }
  },

  /**
   * Check if a vendor name, PAN, GST, or Phone already exists in the organization
   */
  async checkDuplicates(params: {
    organizationId: string
    vendorName: string
    phone?: string
    panNumber?: string
    gstNumber?: string
    excludeId?: string
  }): Promise<{ isDuplicate: boolean; error?: string }> {
    try {
      const cleanName = params.vendorName.trim().toLowerCase()
      const cleanPan = params.panNumber?.trim().toUpperCase()
      const cleanGst = params.gstNumber?.trim().toUpperCase()
      const cleanPhone = params.phone ? params.phone.replace(/[^0-9]/g, '') : ''

      let query = supabase
        .from('vendors')
        .select('id, vendor_name, pan_number, gst_number, phone')
        .eq('organization_id', params.organizationId)

      if (params.excludeId) {
        query = query.neq('id', params.excludeId)
      }

      const { data, error } = await query
      if (error || !data) return { isDuplicate: false }

      for (const v of data) {
        if (v.vendor_name?.trim().toLowerCase() === cleanName) {
          return { isDuplicate: true, error: `Vendor name "${params.vendorName.trim()}" already exists in your organization.` }
        }
        if (cleanPan && v.pan_number?.trim().toUpperCase() === cleanPan) {
          return { isDuplicate: true, error: `PAN Number "${cleanPan}" is already registered under vendor "${v.vendor_name}".` }
        }
        if (cleanGst && v.gst_number?.trim().toUpperCase() === cleanGst) {
          return { isDuplicate: true, error: `GST Number "${cleanGst}" is already registered under vendor "${v.vendor_name}".` }
        }
        if (cleanPhone && v.phone?.replace(/[^0-9]/g, '') === cleanPhone) {
          return { isDuplicate: true, error: `Phone number "${params.phone}" is already registered under vendor "${v.vendor_name}".` }
        }
      }

      return { isDuplicate: false }
    } catch {
      return { isDuplicate: false }
    }
  },

  /**
   * Fetch all assets linked to a specific contractor vendor
   */
  async getVendorAssets(
    organizationId: string,
    vendorId: string
  ): Promise<Array<{ id: string; assetCode: string; vehicleNumber: string; category: string; isActive: boolean }>> {
    try {
      const { data, error } = await supabase
        .from('machinery_assets')
        .select('id, asset_code, vehicle_number, registration_number, asset_category, category, is_active')
        .eq('organization_id', organizationId)
        .eq('vendor_id', vendorId)

      if (error || !data) return []

      return data.map((row) => ({
        id: row.id,
        assetCode: row.asset_code,
        vehicleNumber: row.vehicle_number || row.registration_number || 'N/A',
        category: row.asset_category || row.category || 'OTHER',
        isActive: row.is_active ?? true,
      }))
    } catch {
      return []
    }
  },

  /**
   * Auto-generate a vendor code (e.g. PV-001 or CV-001)
   */
  async generateNextVendorCode(
    organizationId: string,
    vendorType: VendorType
  ): Promise<string> {
    const prefix = vendorType === 'PURCHASE_VENDOR' ? 'PV' : 'CV'
    try {
      const { count } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('vendor_type', vendorType)

      const seq = (count || 0) + 1
      return `${prefix}-${String(seq).padStart(3, '0')}`
    } catch {
      return `${prefix}-${Math.floor(100 + Math.random() * 900)}`
    }
  },

  /**
   * Create a new vendor
   */
  async createVendor(params: {
    organizationId: string
    vendorCode: string
    vendorName: string
    vendorType: VendorType
    contactPerson?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    gstNumber?: string
    panNumber?: string
    aadhaarNumber?: string
    tdsPercentage?: number
    securityDepositAmount?: number
    paymentTerms?: string
    bankName?: string
    accountHolderName?: string
    accountNumber?: string
    ifscCode?: string
    branchName?: string
    documents?: VendorDocument[]
    isActive?: boolean
    notes?: string
  }): Promise<{ vendor: Vendor | null; error: string | null }> {
    try {
      // 1. Duplicate validation (Name, PAN, GST, Phone)
      const dupCheck = await this.checkDuplicates({
        organizationId: params.organizationId,
        vendorName: params.vendorName,
        phone: params.phone,
        panNumber: params.panNumber,
        gstNumber: params.gstNumber,
      })
      if (dupCheck.isDuplicate) {
        return {
          vendor: null,
          error: dupCheck.error || `Vendor '${params.vendorName.trim()}' already exists.`,
        }
      }

      const row = {
        organization_id: params.organizationId,
        vendor_code: params.vendorCode.trim().toUpperCase(),
        vendor_name: params.vendorName.trim(),
        vendor_type: params.vendorType,
        contact_person: params.contactPerson?.trim() || null,
        phone: params.phone?.trim() || null,
        email: params.email?.trim() || null,
        address: params.address?.trim() || null,
        city: params.city?.trim() || null,
        state: params.state?.trim() || 'Maharashtra',
        gst_number: params.gstNumber?.trim().toUpperCase() || null,
        pan_number: params.panNumber?.trim().toUpperCase() || null,
        aadhaar_number: params.aadhaarNumber?.trim() || null,
        tds_percentage: params.tdsPercentage || 0,
        security_deposit_amount: params.securityDepositAmount || 0,
        payment_terms: params.paymentTerms?.trim() || '30 Days',
        bank_name: params.bankName?.trim() || null,
        account_holder_name: params.accountHolderName?.trim() || null,
        account_number: params.accountNumber?.trim() || null,
        ifsc_code: params.ifscCode?.trim().toUpperCase() || null,
        branch_name: params.branchName?.trim() || null,
        documents: params.documents || [],
        is_active: params.isActive ?? true,
        status: (params.isActive ?? true) ? 'ACTIVE' : 'INACTIVE',
        notes: params.notes?.trim() || null,
      }

      const { data, error } = await supabase
        .from('vendors')
        .insert(row)
        .select()
        .single()

      if (error) {
        console.error('[VendorRepo] createVendor error:', error)
        if (error.code === '23505') {
          return { vendor: null, error: 'A vendor with this code or name already exists in your organization.' }
        }
        return { vendor: null, error: error.message }
      }

      return {
        vendor: {
          id: data.id,
          organizationId: data.organization_id,
          vendorCode: data.vendor_code,
          vendorName: data.vendor_name,
          vendorType: data.vendor_type,
          contactPerson: data.contact_person,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
          state: data.state,
          gstNumber: data.gst_number,
          panNumber: data.pan_number,
          aadhaarNumber: data.aadhaar_number,
          tdsPercentage: Number(data.tds_percentage || 0),
          securityDepositAmount: Number(data.security_deposit_amount || 0),
          paymentTerms: data.payment_terms,
          bankName: data.bank_name,
          accountHolderName: data.account_holder_name,
          accountNumber: data.account_number,
          ifscCode: data.ifsc_code,
          branchName: data.branch_name,
          documents: (data.documents as VendorDocument[]) || [],
          isActive: data.is_active,
          status: data.status,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create vendor'
      return { vendor: null, error: msg }
    }
  },

  /**
   * Update an existing vendor
   */
  async updateVendor(
    id: string,
    params: {
      organizationId: string
      vendorName: string
      vendorType: VendorType
      contactPerson?: string
      phone?: string
      email?: string
      address?: string
      city?: string
      state?: string
      gstNumber?: string
      panNumber?: string
      aadhaarNumber?: string
      tdsPercentage?: number
      securityDepositAmount?: number
      paymentTerms?: string
      bankName?: string
      accountHolderName?: string
      accountNumber?: string
      ifscCode?: string
      branchName?: string
      documents?: VendorDocument[]
      isActive?: boolean
      notes?: string
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Duplicate validation (Name, PAN, GST, Phone) excluding current ID
      const dupCheck = await this.checkDuplicates({
        organizationId: params.organizationId,
        vendorName: params.vendorName,
        phone: params.phone,
        panNumber: params.panNumber,
        gstNumber: params.gstNumber,
        excludeId: id,
      })
      if (dupCheck.isDuplicate) {
        return {
          success: false,
          error: dupCheck.error || `Another vendor with name '${params.vendorName.trim()}' already exists.`,
        }
      }

      const updates = {
        vendor_name: params.vendorName.trim(),
        vendor_type: params.vendorType,
        contact_person: params.contactPerson?.trim() || null,
        phone: params.phone?.trim() || null,
        email: params.email?.trim() || null,
        address: params.address?.trim() || null,
        city: params.city?.trim() || null,
        state: params.state?.trim() || 'Maharashtra',
        gst_number: params.gstNumber?.trim().toUpperCase() || null,
        pan_number: params.panNumber?.trim().toUpperCase() || null,
        aadhaar_number: params.aadhaarNumber?.trim() || null,
        tds_percentage: params.tdsPercentage || 0,
        security_deposit_amount: params.securityDepositAmount || 0,
        payment_terms: params.paymentTerms?.trim() || '30 Days',
        bank_name: params.bankName?.trim() || null,
        account_holder_name: params.accountHolderName?.trim() || null,
        account_number: params.accountNumber?.trim() || null,
        ifsc_code: params.ifscCode?.trim().toUpperCase() || null,
        branch_name: params.branchName?.trim() || null,
        documents: params.documents || [],
        is_active: params.isActive ?? true,
        status: (params.isActive ?? true) ? 'ACTIVE' : 'INACTIVE',
        notes: params.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('vendors').update(updates).eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update vendor'
      return { success: false, error: msg }
    }
  },

  /**
   * Toggle vendor status (Active / Inactive)
   */
  async toggleStatus(id: string, isActive: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          is_active: isActive,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update status' }
    }
  },

  /**
   * Delete a vendor
   */
  async deleteVendor(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete vendor' }
    }
  },

  /**
   * Upload vendor document (Aadhaar, PAN, GST, Cheque, Contract) to Supabase Storage
   */
  async uploadDocument(
    file: File,
    vendorCode: string,
    docType: DocumentType
  ): Promise<{ url: string | null; error: string | null }> {
    return StorageService.uploadFile(file, 'vendor-docs', `${vendorCode}_${docType}`)
  },
}

