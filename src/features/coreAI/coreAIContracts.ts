import type {Locale,LocalizedText} from '../../types/museum.ts'
import type {Build,Issue} from '../assembly/assemblyRules.ts'
import type {PartId,CableId,SlotId} from '../assembly/assemblyDefinition.ts'
import type {ScenarioId} from '../assembly/troubleshooting.ts'

export type VerifiedExhibit={id:string;status:'published';title:LocalizedText;description:LocalizedText;specifications:{label:LocalizedText;value:string}[];category:string}
export type CoreAISimulation={power:'off'|'starting'|'running'|'faulted';panelOpen:boolean}
export type CoreAIContext=
 |{kind:'museum';exhibit:VerifiedExhibit|null}
 |{kind:'assembly';build:Build;selected:PartId|CableId|null;target:SlotId|null;next:PartId|CableId|null;simulation?:CoreAISimulation}
 |{kind:'troubleshooting';build:Build;selected:PartId|CableId|null;scenario:ScenarioId|null;findings:Issue[];attempts:number;simulation?:CoreAISimulation}
export type CoreAIHistoryMessage={role:'user'|'assistant';text:string}
export type CoreAIRequest={question:string;locale:Locale;context:CoreAIContext;history?:CoreAIHistoryMessage[];conversationId?:string}
export type CoreAIResponse={answer:string;certainty:'curated'|'catalog'|'clarification'|'unsupported'|'generated';topics:string[]} & (
 |{provider:'mock';offline:true}
 |{provider:'opencode'|'ollama'|'openai-compatible';offline:false;model:string}
)
export type CoreAIErrorCode='disabled'|'unconfigured'|'timeout'|'aborted'|'invalidContext'|'failed'|'authenticationRequired'|'forbidden'|'rateLimited'|'providerUnavailable'|'invalidProviderKey'|'invalidRequest'
export class CoreAIError extends Error{readonly code:CoreAIErrorCode;constructor(code:CoreAIErrorCode){super(code);this.name='CoreAIError';this.code=code}}
export interface CoreAIProvider{readonly id:string;ask(request:CoreAIRequest,options:{signal:AbortSignal}):Promise<CoreAIResponse>}
export type CoreAIStatus={provider:'mock'|'opencode';configured:boolean;model?:string;authenticatedOnly:true;inferenceVerified:false}
export type CoreAIConfig={provider:'auto'|'opencode'|'mock'|'disabled'|'ollama'|'openai-compatible';timeoutMs?:number}
export type FutureServerPolicy={rateLimit:{requests:number;windowMs:number};timeoutMs:number;fallback:'none'|'explicit-offline-opt-in';deployment:'same-host-local-relay'|'authorized-hosted-gateway'}
