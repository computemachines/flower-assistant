/**
 * MessageSchemas.ts
 * TypeScript equivalents of the Python dataclass message schemas defined in
 * primary-interp/src/FlownoApp/messages/ipc_schema.py
 * 
 * Uses classes with discriminated unions based on the 'type' property.
 */

// -----------------------------------------------------------------
// Core Domain Types (Interfaces remain suitable here)
// -----------------------------------------------------------------

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatSummary {
  id: string;
  name: string;
  lastUpdated: string; // ISO format timestamp
}

export interface ApiConfig {
  url?: string;
  token?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

// -----------------------------------------------------------------
// Base IPC Message Class
// -----------------------------------------------------------------

export abstract class IPCMessageBase {
  abstract readonly type: string;
}

// -----------------------------------------------------------------
// Frontend → Python Messages (Commands & Queries)
// -----------------------------------------------------------------

export class NewPromptPayload {
  constructor(
    public id: string,
    public role: "user" | "system",
    public content: string
  ) {}
}

export class NewPromptMessage extends IPCMessageBase {
  readonly type = "new-prompt";
  constructor(public content: NewPromptPayload) {
    super();
  }
}

export class EditMessagePayload {
  constructor(
    public messageId: string,
    public newContent: string
  ) {}
}

export class EditMessageRequest extends IPCMessageBase {
  readonly type = "edit-message";
  constructor(public payload: EditMessagePayload) {
    super();
  }
}

export class DeleteMessagePayload {
  constructor(public messageId: string) {}
}

export class DeleteMessageRequest extends IPCMessageBase {
  readonly type = "delete-message";
  constructor(public payload: DeleteMessagePayload) {
    super();
  }
}

export class LoadChatPayload {
  constructor(public chatId: string) {}
}

export class LoadChatRequest extends IPCMessageBase {
  readonly type = "load-chat";
  constructor(public payload: LoadChatPayload) {
    super();
  }
}

export class CreateNewChatRequest extends IPCMessageBase {
  readonly type = "create-new-chat";
  public payload: null = null;
  constructor() {
    super();
  }
}

export class DeleteAllChatsRequest extends IPCMessageBase {
  readonly type = "delete-all-chats";
  public payload: null = null;
  constructor() {
    super();
  }
}

export class SetApiConfigRequest extends IPCMessageBase {
  readonly type = "set-api-config";
  constructor(public payload: ApiConfig) {
    super();
  }
}

export class StopGenerationRequest extends IPCMessageBase {
  readonly type = "stop-generation";
  public payload: null = null;
  constructor() {
    super();
  }
}

export class GetChatListRequest extends IPCMessageBase {
  readonly type = "get-chat-list";
  public payload: null = null;
  constructor() {
    super();
  }
}

export class GetApiConfigRequest extends IPCMessageBase {
  readonly type = "get-api-config";
  public payload: null = null;
  constructor() {
    super();
  }
}

// -----------------------------------------------------------------
// Python → Frontend Messages (Responses & Events)
// -----------------------------------------------------------------

export class ChatListPayload {
  constructor(public chats: ChatSummary[]) {}
}

export class ChatListResponse extends IPCMessageBase {
  readonly type = "chat-list";
  constructor(public payload: ChatListPayload) {
    super();
  }
}

export class ChatLoadedPayload {
  constructor(
    public chatId: string,
    public messages: Message[]
  ) {}
}

export class ChatLoadedResponse extends IPCMessageBase {
  readonly type = "chat-loaded";
  constructor(public payload: ChatLoadedPayload) {
    super();
  }
}

export class AllChatsDeletedResponse extends IPCMessageBase {
  readonly type = "all-chats-deleted";
  public payload: null = null;
  constructor() {
    super();
  }
}

export class ApiConfigResponse extends IPCMessageBase {
  readonly type = "api-config";
  constructor(public payload: ApiConfig) {
    super();
  }
}

export class MessageDeletedPayload {
  constructor(public messageId: string) {}
}

export class MessageDeletedResponse extends IPCMessageBase {
  readonly type = "message-deleted";
  constructor(public payload: MessageDeletedPayload) {
    super();
  }
}

export class GenerationStoppedResponse extends IPCMessageBase {
  readonly type = "generation-stopped";
  public payload: null = null;
  constructor() {
    super();
  }
}

export class MessageUpdatedPayload {
  constructor(public message: Message) {}
}

export class MessageUpdatedResponse extends IPCMessageBase {
  readonly type = "message-updated";
  constructor(public payload: MessageUpdatedPayload) {
    super();
  }
}

export class AckPayload {
  constructor(
    public originalMessageType: string,
    public success: boolean,
    public message?: string
  ) {}
}

export class AckResponse extends IPCMessageBase {
  readonly type = "ack";
  constructor(public payload: AckPayload) {
    super();
  }
}

export class ErrorPayload {
  constructor(
    public message: string,
    public originalMessageType?: string
  ) {}
}

export class ErrorResponse extends IPCMessageBase {
  readonly type = "error";
  constructor(public payload: ErrorPayload) {
    super();
  }
}

// -----------------------------------------------------------------
// Sentence-related Messages for TTS
// -----------------------------------------------------------------

export class SentenceEventPayload {
  constructor(
    public id: string,
    public chunk_ids: string[],
    public text: string,
    public audio: string,
    public order: number
  ) {}
}

export class SentenceEvent extends IPCMessageBase {
  readonly type = "sentence";
  constructor(public payload: SentenceEventPayload) {
    super();
  }
}

export class SentenceDonePayload {
  constructor(public id: string) {}
}

export class SentenceDoneRequest extends IPCMessageBase {
  readonly type = "sentence-done";
  constructor(public payload: SentenceDonePayload) {
    super();
  }
}

// -----------------------------------------------------------------
// Streaming Response Messages
// -----------------------------------------------------------------

export class NewResponsePayload {
  constructor(
    public id: string,
    public role: "assistant",
    public content: string
  ) {}
}

export class NewResponseMessage extends IPCMessageBase {
  readonly type = "new-response";
  constructor(public response: NewResponsePayload) {
    super();
  }
}

export class ChunkedResponse extends IPCMessageBase {
  readonly type = "chunk";
  constructor(
    public id: string,
    public response_id: string,
    public content: string,
    public finish_reason?: string
  ) {
    super();
  }
}

// -----------------------------------------------------------------
// Type Guards & Message Factory
// -----------------------------------------------------------------

/**
 * Union type of all possible IPC message classes.
 */
export type IPCMessage = 
  | NewPromptMessage
  | EditMessageRequest
  | DeleteMessageRequest
  | LoadChatRequest
  | CreateNewChatRequest
  | DeleteAllChatsRequest
  | SetApiConfigRequest
  | StopGenerationRequest
  | GetChatListRequest
  | GetApiConfigRequest
  | ChatListResponse
  | ChatLoadedResponse
  | AllChatsDeletedResponse
  | ApiConfigResponse
  | MessageDeletedResponse
  | GenerationStoppedResponse
  | MessageUpdatedResponse
  | AckResponse
  | ErrorResponse
  | SentenceEvent
  | SentenceDoneRequest
  | NewResponseMessage
  | ChunkedResponse;

/**
 * Type guard to check if a message object has a specific type property.
 * This works for both class instances and plain objects matching the structure.
 */
export function isMessageOfType<T extends { type: string }>(
  message: any, 
  type: T['type']
): message is T {
  return message && typeof message === 'object' && message.type === type;
}

/**
 * Message Factory to create type-safe IPC message instances.
 */
export class MessageFactory {
  static createNewPrompt(id: string, content: string, role: "user" | "system" = "user"): NewPromptMessage {
    const payload = new NewPromptPayload(id, role, content);
    return new NewPromptMessage(payload);
  }

  static createEditMessage(messageId: string, newContent: string): EditMessageRequest {
    const payload = new EditMessagePayload(messageId, newContent);
    return new EditMessageRequest(payload);
  }

  static createLoadChat(chatId: string): LoadChatRequest {
    const payload = new LoadChatPayload(chatId);
    return new LoadChatRequest(payload);
  }

  static createNewChat(): CreateNewChatRequest {
    return new CreateNewChatRequest();
  }

  static createGetChatList(): GetChatListRequest {
    return new GetChatListRequest();
  }

  static createStopGeneration(): StopGenerationRequest {
    return new StopGenerationRequest();
  }

  static createSetApiConfig(config: ApiConfig): SetApiConfigRequest {
    // Assuming config is already an object matching the interface
    return new SetApiConfigRequest(config);
  }

  // Additional factory methods can be added as needed
}