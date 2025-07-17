import { useEffect, useState, useCallback, useRef } from "react";
import type { 
  TaskStatusUpdateEvent, 
  Message,
  DataPart,
  TaskState as A2ATaskState 
} from "@a2a-js/sdk";
import { EXTENSION_URIS } from "@/lib/agent-card";

export interface A2AStreamMessage {
  id: string;
  timestamp: string;
  state: A2ATaskState;
  message: Message;
  isHITL: boolean;
  requestId?: string;
  extensionUri?: string;
  data?: unknown;
}

export interface A2AStreamState {
  messages: A2AStreamMessage[];
  isConnected: boolean;
  isCompleted: boolean;
  error: string | null;
  taskId: string | null;
}

export function useA2AStream(taskId: string | null, streamUrl?: string | null) {
  const [state, setState] = useState<A2AStreamState>({
    messages: [],
    isConnected: false,
    isCompleted: false,
    error: null,
    taskId,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const completedMessageIds = useRef<Set<string>>(new Set()); // 承認済みのmessageIdを記録

  const processStatusUpdate = useCallback((event: TaskStatusUpdateEvent) => {
    const { status } = event;
    const message = status.message as Message;
    
    // Generate a unique event key for deduplication
    const eventKey = `${status.state}-${message?.messageId || 'no-message'}-${status.timestamp || Date.now()}`;
    
    // Check for duplicate events (more comprehensive)
    if (processedMessageIds.current.has(eventKey)) {
      console.log("Duplicate event detected, skipping:", eventKey);
      return;
    }
    
    processedMessageIds.current.add(eventKey);

    // Extract data from DataPart
    const dataPart = message?.parts?.find(part => part.kind === "data") as DataPart | undefined;
    const data = dataPart?.data;

    // Determine if this is a HITL prompt
    const requestId = data?.requestId as string | undefined;
    const messageId = message?.messageId;
    const isHITL = status.state === "input-required" && requestId && messageId && !completedMessageIds.current.has(messageId);

    // Get extension URI from message
    const extensionUri = message?.extensions?.[0];

    const streamMessage: A2AStreamMessage = {
      id: message?.messageId || crypto.randomUUID(),
      timestamp: new Date().toISOString(), // Use current timestamp since Message doesn't have timestamp
      state: status.state,
      message: message || { role: 'agent', messageId: crypto.randomUUID(), kind: 'message', parts: [] },
      isHITL: Boolean(isHITL),
      requestId,
      extensionUri,
      data,
    };

    console.log("Processing status update:", { state: status.state, requestId, messageId, isHITL, eventKey });

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, streamMessage],
      isCompleted: status.state === "completed",
    }));
  }, []);

  // Removed connect and disconnect functions since we handle everything in useEffect

  const sendFeedback = useCallback(async (
    requestId: string,
    approved: boolean,
    feedback?: string
  ) => {
    if (!taskId) return;

    try {
      // Determine event type based on the extension
      const hitlMessage = state.messages.find(m => m.requestId === requestId);
      let eventType = "plan";
      
      if (hitlMessage?.extensionUri === EXTENSION_URIS.RESEARCH_EXECUTION_RESPONSE) {
        eventType = "execution";
      }

      // Create A2A-compliant message
      const a2aMessage: Message = {
        role: "user",
        messageId: crypto.randomUUID(),
        kind: "message",
        extensions: [EXTENSION_URIS.HITL_FEEDBACK],
        parts: [
          {
            kind: "text",
            text: approved ? "Approved" : `Rejected: ${feedback || "No specific feedback"}`
          },
          {
            kind: "data",
            data: {
              requestId,
              approved,
              feedback,
              eventType,
              context: eventType === "execution" ? "execution" : "plan"
            }
          }
        ]
      };

      // Send via A2A message/send endpoint
      const jsonRpcRequest = {
        jsonrpc: "2.0" as const,
        id: crypto.randomUUID(),
        method: "message/send",
        params: {
          message: a2aMessage,
          context: {
            taskId
          }
        }
      };

      const response = await fetch("/api/a2a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonRpcRequest),
      });

      if (!response.ok) {
        throw new Error("Failed to send feedback");
      }

      const jsonRpcResponse = await response.json();
      if (jsonRpcResponse.error) {
        throw new Error(jsonRpcResponse.error.message || "Failed to send feedback");
      }

      // Find the message and mark its messageId as completed to prevent future duplicates
      const targetMessage = state.messages.find(m => m.requestId === requestId);
      if (targetMessage?.message.messageId) {
        completedMessageIds.current.add(targetMessage.message.messageId);
      }

      // Update local state to mark the HITL as completed
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.requestId === requestId 
            ? { ...msg, isHITL: false }
            : msg
        )
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : "Failed to send feedback" 
      }));
    }
  }, [taskId, state.messages]);

  useEffect(() => {
    if (!taskId) {
      // No taskId, ensure we're disconnected
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setState(prev => ({ ...prev, isConnected: false }));
      return;
    }

    // Disconnect any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Reset state for new task
    setState({
      messages: [],
      isConnected: false,
      isCompleted: false,
      error: null,
      taskId,
    });
    processedMessageIds.current.clear();
    completedMessageIds.current.clear(); // 承認済みmessageIdもリセット
    
    // Connect to new task
    try {
      // Use provided streamUrl or construct default URL
      const url = streamUrl || `/api/a2a/events?taskId=${taskId}`;
      console.log(`[useA2AStream] Connecting to SSE: ${url}`);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      // Handle different event types
      eventSource.addEventListener('status-update', (event: MessageEvent) => {
        console.log("Status update event:", event);
        try {
          const statusUpdate = JSON.parse(event.data) as TaskStatusUpdateEvent;
          processStatusUpdate(statusUpdate);
        } catch (error) {
          console.error("Error parsing status update:", error);
        }
      });

      // Handle A2A events from the new cross-process registry
      eventSource.addEventListener('a2a-event', (event: MessageEvent) => {
        console.log("A2A event received:", event);
        try {
          const eventData = JSON.parse(event.data);
          console.log("Parsed A2A event data:", eventData);
          
          if (eventData.kind === "status-update") {
            processStatusUpdate(eventData);
          }
          // Handle artifact updates
          if (eventData.kind === "artifact-update") {
            console.log("Artifact update received:", eventData.artifact);
          }
        } catch (error) {
          console.error("Error parsing A2A event:", error);
        }
      });

      eventSource.addEventListener('artifact-update', (event: MessageEvent) => {
        console.log("Artifact update event:", event);
        try {
          const artifactUpdate = JSON.parse(event.data);
          console.log("Artifact update received:", artifactUpdate);
          // Handle artifact updates if needed
        } catch (error) {
          console.error("Error parsing artifact update:", error);
        }
      });

      eventSource.addEventListener('connected', (event: MessageEvent) => {
        console.log("Connected event:", event);
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      });

      eventSource.onmessage = (event) => {
        console.log("Generic SSE message received:", event);
        try {
          const data = JSON.parse(event.data);
          console.log("Parsed SSE data:", data);
          
          // Handle based on the 'kind' field
          if (data.kind === "status-update") {
            processStatusUpdate(data as TaskStatusUpdateEvent);
          } else if (data.kind === "artifact-update") {
            console.log("Artifact update in onmessage:", data);
            // Handle artifact updates if needed
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };

      eventSource.onerror = () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          error: "Connection lost. Attempting to reconnect..." 
        }));

        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (taskId) { // Only reconnect if we still have a taskId
            const retryUrl = streamUrl || `/api/a2a/events?taskId=${taskId}`;
            console.log(`[useA2AStream] Reconnecting to SSE: ${retryUrl}`);
            
            const newEventSource = new EventSource(retryUrl);
            eventSourceRef.current = newEventSource;
            // Re-attach all event handlers (copy the setup above)
            // ... (handlers would be duplicated here in real implementation)
          }
        }, 3000);
      };
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : "Failed to connect" 
      }));
    }
    
    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [taskId, streamUrl, processStatusUpdate]);

  return {
    ...state,
    sendFeedback,
  };
}