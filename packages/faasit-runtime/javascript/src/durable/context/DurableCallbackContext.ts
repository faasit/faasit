import { OrchestratorMetadata } from "../../runtime/FaasitRuntime"

// Pass data by callback context
export type DurableCallbackContext = {
  kind: 'durable-orchestrator-callback'
  orchestrator: OrchestratorMetadata
  taskPc: number
}
