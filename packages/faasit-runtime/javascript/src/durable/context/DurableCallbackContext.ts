import { OrchestratorMetadata } from "../../FaasitRuntime"

// Pass data by callback context
export type DurableCallbackContext = {
  kind: 'durable-orchestrator-callback'
  orchestrator: OrchestratorMetadata
  taskPc: number
}
