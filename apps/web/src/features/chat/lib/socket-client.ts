import { io, type Socket } from 'socket.io-client'

const CHAT_SERVER_URL =
  process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket?.connected) {
    socket.auth = { token }
    return socket
  }
  if (socket) {
    socket.auth = { token }
    socket.connect()
    return socket
  }
  socket = io(CHAT_SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionAttempts: 10,
  })
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
