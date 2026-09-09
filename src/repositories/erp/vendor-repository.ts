import { supabase } from '../../lib/supabase'

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
   * Check if a vendor name already exists in the organization
   */
  async isDuplicateName(organizationId: string, name: string, excludeId?: string): Promise<boolean> {
    try {
      const cleanName = name.trim().toLowerCase()
      let query = supabase
        .from('vendors')
        .select('id, vendor_name')
        .eq('organization_id', organizationId)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query
      if (error || !data) return false

      return data.some((v) => v.vendor_name.trim().toLowerCase() === cleanName)
    } catch {
      return false
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
      // 1. Duplicate name validation
      const isDup = await this.isDuplicateName(params.organizationId, params.vendorName)
      if (isDup) {
        return {
          vendor: null,
          error: `Vendor '${params.vendorName.trim()}' already exists. Duplicate vendor names are not allowed.`,
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
      // Duplicate name validation excluding current ID
      const isDup = await this.isDuplicateName(params.organizationId, params.vendorName, id)
      if (isDup) {
        return {
          success: false,
          error: `Another vendor with name '${params.vendorName.trim()}' already exists.`,
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
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const cleanFileName = `vendor-docs/${vendorCode}_${docType}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('apk-releases')
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        // Fallback to data URL
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

