import { ConversationSummary, ConversationMessagesResponse, Message, UnreadCountResponse } from './types';
import { AvailableRecipientsResponse } from './types';

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

// 使用后端真实地址，避免在开发环境下相对路径命中前端(3000)导致404
const BACKEND_BASE = 'http://localhost:8000';
const API_BASE = `${BACKEND_BASE}/api/v1`;

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return authFetch(`${API_BASE}/messages/unread-count`);
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  return authFetch(`${API_BASE}/conversations`);
}

export async function fetchConversationMessages(conversationId: number, skip = 0, limit = 50): Promise<ConversationMessagesResponse> {
  return authFetch(`${API_BASE}/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`);
}

export async function sendMessage(recipientUserId: number, content: string): Promise<Message> {
  return authFetch(`${API_BASE}/messages/send`, {
    method: 'POST',
    body: JSON.stringify({ recipient_user_id: recipientUserId, content })
  });
}

export async function markConversationRead(conversationId: number): Promise<{ updated: number }> {
  return authFetch(`${API_BASE}/conversations/${conversationId}/read`, { method: 'POST' });
}

// WebSocket 管理器（简单版本）
export function connectMessageSocket(onMessage: (msg: Message) => void): WebSocket | null {
  const token = getAuthToken();
  if (!token) return null;
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${scheme}://localhost:8000/api/v1/ws/messages?token=${token}`;
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.type === 'message') {
        onMessage(data.payload as Message);
      }
    } catch (_) {
      // 忽略解析错误
    }
  };
  return ws;
}

export async function fetchAvailableRecipients(): Promise<AvailableRecipientsResponse> {
  return authFetch(`${API_BASE}/messages/available-recipients`);
}
