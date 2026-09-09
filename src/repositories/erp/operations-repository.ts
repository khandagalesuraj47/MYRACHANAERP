import { supabase } from '../../lib/supabase'
import type {
  DieselTransaction,
  MachineryAsset,
  MaterialItem,
  MaterialTransaction,
  PurchaseOrder,
  AuditLogEntry,
  DynamicForm,
  FormField,
  WorkflowDefinition,
} from '../../types/enterprise-erp'

export class OperationsRepository {
  // --------------------------------------------------------------------------
  // 1. DIESEL / FUEL MANAGEMENT
  // --------------------------------------------------------------------------
  static async getDieselTransactions(organizationId: string): Promise<DieselTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('diesel_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('transaction_date', { ascending: false })

      if (error || !data) return []

      return data.map((d) => ({
        id: d.id,
        organizationId: d.organization_id,
        transactionType: d.transaction_type,
        transactionDate: d.transaction_date,
        slipNumber: d.slip_number,
        machineAssetId: d.machine_asset_id,
        vehicleNumber: d.vehicle_number,
        liters: Number(d.liters || 0),
        ratePerLiter: d.rate_per_liter ? Number(d.rate_per_liter) : null,
        totalAmount: d.total_amount ? Number(d.total_amount) : null,
        currentMeterReading: d.current_meter_reading ? Number(d.current_meter_reading) : null,
        issuedTo: d.issued_to,
        siteLocation: d.site_location,
        notes: d.notes,
        createdAt: d.created_at,
      }))
    } catch {
      return []
    }
  }

  static async logDieselIssue(payload: Omit<DieselTransaction, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('diesel_transactions').insert({
        organization_id: payload.organizationId,
        transaction_type: payload.transactionType,
        transaction_date: payload.transactionDate,
        slip_number: payload.slipNumber,
        machine_asset_id: payload.machineAssetId,
        vehicle_number: payload.vehicleNumber,
        liters: payload.liters,
        rate_per_liter: payload.ratePerLiter,
        total_amount: payload.totalAmount,
        current_meter_reading: payload.currentMeterReading,
        issued_to: payload.issuedTo,
        site_location: payload.siteLocation,
        notes: payload.notes,
      })

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error logging diesel' }
    }
  }

  // --------------------------------------------------------------------------
  // 2. HEAVY MACHINERY & FLEET
  // --------------------------------------------------------------------------
  static async getMachineryAssets(organizationId: string): Promise<MachineryAsset[]> {
    try {
      const { data, error } = await supabase
        .from('machinery_assets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('asset_code', { ascending: true })

      if (error || !data) return []

      return data.map((m) => ({
        id: m.id,
        organizationId: m.organization_id,
        assetCode: m.asset_code,
        name: m.name,
        category: m.category,
        registrationNumber: m.registration_number,
        model: m.model,
        status: m.status,
        cumulativeHours: Number(m.cumulative_hours || 0),
        currentSite: m.current_site,
        operatorName: m.operator_name,
        isActive: m.is_active,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }))
    } catch {
      return []
    }
  }

  static async addMachineryAsset(payload: Omit<MachineryAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('machinery_assets').insert({
        organization_id: payload.organizationId,
        asset_code: payload.assetCode,
        name: payload.name,
        category: payload.category,
        registration_number: payload.registrationNumber,
        model: payload.model,
        status: payload.status,
        cumulative_hours: payload.cumulativeHours,
        current_site: payload.currentSite,
        operator_name: payload.operatorName,
        is_active: payload.isActive,
      })

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error adding asset' }
    }
  }

  // --------------------------------------------------------------------------
  // 3. INVENTORY & MATERIALS
  // --------------------------------------------------------------------------
  static async getMaterialItems(organizationId: string): Promise<MaterialItem[]> {
    try {
      const { data, error } = await supabase
        .from('material_items')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (error || !data) return []

      return data.map((item) => ({
        id: item.id,
        organizationId: item.organization_id,
        itemCode: item.item_code,
        name: item.name,
        category: item.category,
        unitOfMeasure: item.unit_of_measure,
        currentStock: Number(item.current_stock || 0),
        reorderLevel: Number(item.reorder_level || 0),
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))
    } catch {
      return []
    }
  }

  static async getMaterialTransactions(organizationId: string): Promise<MaterialTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('material_transactions')
        .select('*, material_items(id, name, unit_of_measure)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error || !data) return []

      return data.map((t) => ({
        id: t.id,
        organizationId: t.organization_id,
        materialItemId: t.material_item_id,
        materialItem: t.material_items ? {
          id: t.material_items.id,
          name: t.material_items.name,
          unitOfMeasure: t.material_items.unit_of_measure,
        } as MaterialItem : undefined,
        transactionType: t.transaction_type,
        referenceNumber: t.reference_number,
        quantity: Number(t.quantity || 0),
        siteLocation: t.site_location,
        vendorSupplier: t.vendor_supplier,
        issuedTo: t.issued_to,
        notes: t.notes,
        createdAt: t.created_at,
      }))
    } catch {
      return []
    }
  }

  static async logMaterialTransaction(payload: Omit<MaterialTransaction, 'id' | 'createdAt' | 'materialItem'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('material_transactions').insert({
        organization_id: payload.organizationId,
        material_item_id: payload.materialItemId,
        transaction_type: payload.transactionType,
        reference_number: payload.referenceNumber,
        quantity: payload.quantity,
        site_location: payload.siteLocation,
        vendor_supplier: payload.vendorSupplier,
        issued_to: payload.issuedTo,
        notes: payload.notes,
      })

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error logging transaction' }
    }
  }

  // --------------------------------------------------------------------------
  // 4. PROCUREMENT & PURCHASE ORDERS
  // --------------------------------------------------------------------------
  static async getPurchaseOrders(organizationId: string): Promise<PurchaseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error || !data) return []

      return data.map((po) => ({
        id: po.id,
        organizationId: po.organization_id,
        poNumber: po.po_number,
        vendorName: po.vendor_name,
        totalAmount: Number(po.total_amount || 0),
        status: po.status,
        requestedBy: po.requested_by,
        approvedBy: po.approved_by,
        expectedDeliveryDate: po.expected_delivery_date,
        notes: po.notes,
        createdAt: po.created_at,
        updatedAt: po.updated_at,
      }))
    } catch {
      return []
    }
  }

  static async createPurchaseOrder(payload: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('purchase_orders').insert({
        organization_id: payload.organizationId,
        po_number: payload.poNumber,
        vendor_name: payload.vendorName,
        total_amount: payload.totalAmount,
        status: payload.status,
        expected_delivery_date: payload.expectedDeliveryDate,
        notes: payload.notes,
      })

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error creating PO' }
    }
  }

  // --------------------------------------------------------------------------
  // 5. IMMUTABLE AUDIT LOGS
  // --------------------------------------------------------------------------
  static async getAuditLogs(organizationId: string): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error || !data) return []

      return data.map((a) => ({
        id: a.id,
        organizationId: a.organization_id,
        actorId: a.actor_id,
        action: a.action,
        entityType: a.entity_type,
        entityId: a.entity_id,
        details: a.details,
        createdAt: a.created_at,
      }))
    } catch {
      return []
    }
  }

  // --------------------------------------------------------------------------
  // 6. DYNAMIC FORMS & SUBMISSIONS
  // --------------------------------------------------------------------------
  static async getForms(organizationId: string): Promise<DynamicForm[]> {
    try {
      const { data: forms, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (formsError || !forms) return []

      const formIds = forms.map((f) => f.id)
      const fieldsMap = new Map<string, FormField[]>()

      if (formIds.length > 0) {
        const { data: fields } = await supabase
          .from('form_fields')
          .select('*')
          .in('form_id', formIds)
          .order('order_index', { ascending: true })

        if (fields) {
          fields.forEach((f) => {
            const list = fieldsMap.get(f.form_id) || []
            list.push({
              id: f.id,
              formId: f.form_id,
              fieldCode: f.field_code,
              label: f.label,
              fieldType: f.field_type,
              isRequired: f.is_required,
              defaultValue: f.default_value,
              placeholder: f.placeholder,
              orderIndex: f.order_index,
              options: f.options,
            })
            fieldsMap.set(f.form_id, list)
          })
        }
      }

      return forms.map((f) => ({
        id: f.id,
        organizationId: f.organization_id,
        code: f.code,
        name: f.name,
        description: f.description,
        module: f.module,
        status: f.status,
        currentVersion: f.current_version,
        isActive: f.is_active,
        fields: fieldsMap.get(f.id) || [],
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }))
    } catch {
      return []
    }
  }

  static async submitForm(payload: { organizationId: string; formId: string; userId: string; data: Record<string, unknown> }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('form_submissions').insert({
        organization_id: payload.organizationId,
        form_id: payload.formId,
        submitted_by: payload.userId,
        status: 'SUBMITTED',
        data: payload.data,
      })

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error submitting form' }
    }
  }

  // --------------------------------------------------------------------------
  // 7. WORKFLOWS
  // --------------------------------------------------------------------------
  static async getWorkflows(organizationId: string): Promise<WorkflowDefinition[]> {
    try {
      const { data: wfs, error } = await supabase
        .from('workflow_definitions')
        .select('*, workflow_stages(*)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error || !wfs) return []

      return wfs.map((w) => ({
        id: w.id,
        organizationId: w.organization_id,
        code: w.code,
        name: w.name,
        module: w.module,
        isActive: w.is_active,
        stages: (w.workflow_stages || []).map((s: { id: string; workflow_id: string; stage_order: number; name: string; approver_role: string; min_amount?: number | null; max_amount?: number | null; sla_hours?: number }) => ({
          id: s.id,
          workflowId: s.workflow_id,
          stageOrder: s.stage_order,
          name: s.name,
          approverRole: s.approver_role,
          minAmount: s.min_amount ? Number(s.min_amount) : null,
          maxAmount: s.max_amount ? Number(s.max_amount) : null,
          slaHours: s.sla_hours ?? 24,
        })),
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      }))
    } catch {
      return []
    }
  }
}
