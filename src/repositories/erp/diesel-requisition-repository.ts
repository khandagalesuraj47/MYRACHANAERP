import { supabase } from '../../lib/supabase'
import { StorageService } from '../../lib/storage-service'

export interface DieselParty {
  id: string
  organizationId: string
  name: string
  location?: string | null
  contactPerson?: string | null
  contactPhone?: string | null
  gstNumber?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DieselRequisition {
  id: string
  organizationId: string
  projectId?: string | null
  siteId?: string | null
  requisitionNo: string
  requisitionDate: string
  bowserVehicleNo: string
  bowserCapacityLiters: number
  requestedLiters: number
  previousConsumptionNotes?: string | null
  attachmentUrls: string[]
  partyId?: string | null
  partyName?: string | null
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  stage: number
  createdByUserId?: string | null
  createdByName?: string | null
  createdAt: string
  verifiedByUserId?: string | null
  verifiedByName?: string | null
  verifiedAt?: string | null
  verificationNotes?: string | null
  approvedByUserId?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  approvalNotes?: string | null
  updatedAt: string
}

export const DieselRequisitionRepository = {
  /**
   * Fetch all diesel parties / petrol pumps
   */
  async getParties(organizationId: string): Promise<DieselParty[]> {
    try {
      const { data, error } = await supabase
        .from('diesel_parties')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('[DieselRepo] getParties error:', error)
        return []
      }

      return (data || []).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        location: row.location,
        contactPerson: row.contact_person,
        contactPhone: row.contact_phone,
        gstNumber: row.gst_number,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } catch (err) {
      console.error('[DieselRepo] getParties exception:', err)
      return []
    }
  },

  /**
   * Create a new diesel party / pump
   */
  async createParty(params: {
    organizationId: string
    name: string
    location?: string
    contactPerson?: string
    contactPhone?: string
    gstNumber?: string
  }): Promise<{ party: DieselParty | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('diesel_parties')
        .insert({
          organization_id: params.organizationId,
          name: params.name.trim(),
          location: params.location?.trim() || null,
          contact_person: params.contactPerson?.trim() || null,
          contact_phone: params.contactPhone?.trim() || null,
          gst_number: params.gstNumber?.trim() || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return { party: null, error: error.message }
      }

      return {
        party: {
          id: data.id,
          organizationId: data.organization_id,
          name: data.name,
          location: data.location,
          contactPerson: data.contact_person,
          contactPhone: data.contact_phone,
          gstNumber: data.gst_number,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create party'
      return { party: null, error: msg }
    }
  },

  /**
   * Fetch all diesel requisitions for organization, optionally filtered by site
   */
  async getRequisitions(organizationId: string, siteId?: string): Promise<DieselRequisition[]> {
    try {
      let query = supabase
        .from('diesel_requisitions')
        .select('*')
        .eq('organization_id', organizationId)

      if (siteId) {
        query = query.eq('site_id', siteId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('[DieselRepo] getRequisitions error:', error)
        return []
      }

      return (data || []).map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        projectId: r.project_id,
        siteId: r.site_id,
        requisitionNo: r.requisition_no,
        requisitionDate: r.requisition_date,
        bowserVehicleNo: r.bowser_vehicle_no || 'Bowser (2300 Ltr)',
        bowserCapacityLiters: Number(r.bowser_capacity_liters) || 2300,
        requestedLiters: Number(r.requested_liters) || 0,
        previousConsumptionNotes: r.previous_consumption_notes,
        attachmentUrls: r.attachment_urls || [],
        partyId: r.party_id,
        partyName: r.party_name,
        status: r.status,
        stage: r.stage,
        createdByUserId: r.created_by_user_id,
        createdByName: r.created_by_name,
        createdAt: r.created_at,
        verifiedByUserId: r.verified_by_user_id,
        verifiedByName: r.verified_by_name,
        verifiedAt: r.verified_at,
        verificationNotes: r.verification_notes,
        approvedByUserId: r.approved_by_user_id,
        approvedByName: r.approved_by_name,
        approvedAt: r.approved_at,
        approvalNotes: r.approval_notes,
        updatedAt: r.updated_at,
      }))
    } catch (err) {
      console.error('[DieselRepo] getRequisitions exception:', err)
      return []
    }
  },

  /**
   * Generate next requisition number (e.g. VTR-REQ-2026-0001)
   */
  async generateNextRequisitionNo(_organizationId?: string): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `VTR-DSL-${year}`
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}-${randomSuffix}`
  },

  /**
   * Stage 1: Create new Diesel Requisition (Raised by Field In-Charge)
   */
  async createRequisition(params: {
    organizationId: string
    projectId?: string
    siteId?: string
    requisitionNo: string
    requisitionDate: string
    bowserVehicleNo?: string
    bowserCapacityLiters?: number
    requestedLiters: number
    previousConsumptionNotes?: string
    attachmentUrls?: string[]
    createdByUserId: string
    createdByName: string
  }): Promise<{ requisition: DieselRequisition | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('diesel_requisitions')
        .insert({
          organization_id: params.organizationId,
          project_id: params.projectId || null,
          site_id: params.siteId || null,
          requisition_no: params.requisitionNo,
          requisition_date: params.requisitionDate,
          bowser_vehicle_no: params.bowserVehicleNo || 'Bowser (2300 Ltr)',
          bowser_capacity_liters: params.bowserCapacityLiters || 2300,
          requested_liters: params.requestedLiters,
          previous_consumption_notes: params.previousConsumptionNotes?.trim() || null,
          attachment_urls: params.attachmentUrls || [],
          status: 'PENDING_VERIFICATION',
          stage: 1,
          created_by_user_id: params.createdByUserId,
          created_by_name: params.createdByName,
        })
        .select()
        .single()

      if (error) {
        return { requisition: null, error: error.message }
      }

      return {
        requisition: {
          id: data.id,
          organizationId: data.organization_id,
          projectId: data.project_id,
          siteId: data.site_id,
          requisitionNo: data.requisition_no,
          requisitionDate: data.requisition_date,
          bowserVehicleNo: data.bowser_vehicle_no,
          bowserCapacityLiters: Number(data.bowser_capacity_liters),
          requestedLiters: Number(data.requested_liters),
          previousConsumptionNotes: data.previous_consumption_notes,
          attachmentUrls: data.attachment_urls || [],
          partyId: data.party_id,
          partyName: data.party_name,
          status: data.status,
          stage: data.stage,
          createdByUserId: data.created_by_user_id,
          createdByName: data.created_by_name,
          createdAt: data.created_at,
          verifiedByUserId: data.verified_by_user_id,
          verifiedByName: data.verified_by_name,
          verifiedAt: data.verified_at,
          verificationNotes: data.verification_notes,
          approvedByUserId: data.approved_by_user_id,
          approvedByName: data.approved_by_name,
          approvedAt: data.approved_at,
          approvalNotes: data.approval_notes,
          updatedAt: data.updated_at,
        },
        error: null,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create requisition'
      return { requisition: null, error: msg }
    }
  },

  /**
   * Stage 2: Verify & Assign Party (Scrutiny by Operator)
   */
  async verifyRequisition(
    id: string,
    params: {
      partyId: string
      partyName: string
      verifiedByUserId: string
      verifiedByName: string
      verificationNotes?: string
      requestedLiters?: number
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateData: Record<string, any> = {
        party_id: params.partyId,
        party_name: params.partyName,
        verified_by_user_id: params.verifiedByUserId,
        verified_by_name: params.verifiedByName,
        verified_at: new Date().toISOString(),
        verification_notes: params.verificationNotes?.trim() || null,
        status: 'PENDING_APPROVAL',
        stage: 2,
        updated_at: new Date().toISOString(),
      }

      if (params.requestedLiters !== undefined) {
        updateData.requested_liters = params.requestedLiters
      }

      const { error } = await supabase
        .from('diesel_requisitions')
        .update(updateData)
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify requisition'
      return { success: false, error: msg }
    }
  },

  /**
   * Stage 3: Final Approval (by General Manager)
   */
  async approveRequisition(
    id: string,
    params: {
      approvedByUserId: string
      approvedByName: string
      approvalNotes?: string
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('diesel_requisitions')
        .update({
          approved_by_user_id: params.approvedByUserId,
          approved_by_name: params.approvedByName,
          approved_at: new Date().toISOString(),
          approval_notes: params.approvalNotes?.trim() || null,
          status: 'APPROVED',
          stage: 3,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve requisition'
      return { success: false, error: msg }
    }
  },

  /**
   * Stage 3: Rejection (by General Manager or Verifier)
   */
  async rejectRequisition(
    id: string,
    params: {
      userId: string
      userName: string
      reason: string
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('diesel_requisitions')
        .update({
          approved_by_user_id: params.userId,
          approved_by_name: params.userName,
          approval_notes: `REJECTED: ${params.reason.trim()}`,
          status: 'REJECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject requisition'
      return { success: false, error: msg }
    }
  },

  /**
   * General Edit: Allows any participant (Requisitioner, Verifier, GM, Admin) to edit fields
   */
  async updateRequisition(
    id: string,
    params: {
      requestedLiters?: number
      previousConsumptionNotes?: string
      bowserVehicleNo?: string
      partyId?: string
      partyName?: string
      attachmentUrls?: string[]
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }
      if (params.requestedLiters !== undefined) updateData.requested_liters = params.requestedLiters
      if (params.previousConsumptionNotes !== undefined) updateData.previous_consumption_notes = params.previousConsumptionNotes
      if (params.bowserVehicleNo !== undefined) updateData.bowser_vehicle_no = params.bowserVehicleNo
      if (params.partyId !== undefined) updateData.party_id = params.partyId
      if (params.partyName !== undefined) updateData.party_name = params.partyName
      if (params.attachmentUrls !== undefined) updateData.attachment_urls = params.attachmentUrls

      const { error } = await supabase
        .from('diesel_requisitions')
        .update(updateData)
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update requisition'
      return { success: false, error: msg }
    }
  },

  /**
   * Delete: Allows authorized participant to remove a requisition
   */
  async deleteRequisition(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('diesel_requisitions')
        .delete()
        .eq('id', id)

      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete requisition'
      return { success: false, error: msg }
    }
  },

  /**
   * Upload attachment (Photo / PDF) to Supabase Storage
   */
  async uploadAttachment(
    file: File,
    organizationId: string,
    requisitionNo: string
  ): Promise<{ url: string | null; error: string | null }> {
    return StorageService.uploadFile(file, 'diesel-attachments', `${organizationId}_${requisitionNo}`)
  },
}

