export interface DynamicForm {
  id: string
  organizationId: string
  code: string
  name: string
  description?: string | null
  module: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  currentVersion: number
  isActive: boolean
  fields?: FormField[]
  createdAt: string
  updatedAt: string
}

export interface FormField {
  id: string
  formId: string
  fieldCode: string
  label: string
  fieldType: 'TEXT' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'TEXTAREA'
  isRequired: boolean
  defaultValue?: string | null
  placeholder?: string | null
  orderIndex: number
  options?: Array<{ label: string; value: string }>
}

export interface FormSubmission {
  id: string
  organizationId: string
  formId: string
  submittedBy: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface WorkflowDefinition {
  id: string
  organizationId: string
  code: string
  name: string
  module: string
  isActive: boolean
  stages?: WorkflowStage[]
  createdAt: string
  updatedAt: string
}

export interface WorkflowStage {
  id: string
  workflowId: string
  stageOrder: number
  name: string
  approverRole: string
  minAmount?: number | null
  maxAmount?: number | null
  slaHours: number
}

export interface DieselTransaction {
  id: string
  organizationId: string
  transactionType: 'ISSUE' | 'RECEIPT' | 'TRANSFER'
  transactionDate: string
  slipNumber: string
  machineAssetId?: string | null
  vehicleNumber?: string | null
  liters: number
  ratePerLiter?: number | null
  totalAmount?: number | null
  currentMeterReading?: number | null
  issuedTo?: string | null
  siteLocation?: string | null
  notes?: string | null
  createdAt: string
}

export interface MachineryAsset {
  id: string
  organizationId: string
  assetCode: string
  name: string
  category: 'EXCAVATOR' | 'DUMPER' | 'TRANSIT_MIXER' | 'BATCHING_PLANT' | 'ROLLER' | 'CRANE' | 'GENERATOR' | 'OTHER'
  registrationNumber?: string | null
  model?: string | null
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BREAKDOWN' | 'IDLE'
  cumulativeHours: number
  currentSite?: string | null
  operatorName?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MaterialItem {
  id: string
  organizationId: string
  itemCode: string
  name: string
  category: 'CEMENT' | 'STEEL' | 'AGGREGATE' | 'SAND' | 'FUEL' | 'SPARES' | 'CHEMICAL' | 'OTHER'
  unitOfMeasure: string
  currentStock: number
  reorderLevel: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MaterialTransaction {
  id: string
  organizationId: string
  materialItemId: string
  materialItem?: MaterialItem
  transactionType: 'INWARD_GRN' | 'OUTWARD_ISSUE' | 'RETURN'
  referenceNumber: string
  quantity: number
  siteLocation?: string | null
  vendorSupplier?: string | null
  issuedTo?: string | null
  notes?: string | null
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  organizationId: string
  poNumber: string
  vendorName: string
  totalAmount: number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED'
  requestedBy?: string | null
  approvedBy?: string | null
  expectedDeliveryDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  organizationId: string
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown> | null
  createdAt: string
}
