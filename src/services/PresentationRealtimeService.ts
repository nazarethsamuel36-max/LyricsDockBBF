import { supabase } from '../lib/supabaseClient'
import type { PresentationCommand } from '../types/PresentationCommand'
import type { PresentationCommandEnvelope } from '../types/PresentationCommand'
import { getDeviceId } from './RoomService'

type CommandCallback = (command: PresentationCommand) => void
type ControllerConnectedCallback = (payload: { deviceId: string; role: string }) => void

class PresentationRealtimeService {
  private channel: ReturnType<typeof supabase.channel> | null = null
  private roomId: string | null = null
  private authorizedControllerId: string | null = null
  private lastSequence = 0
  private sequence = 0
  private callbacks = new Set<CommandCallback>()
  private controllerConnectCallbacks = new Set<ControllerConnectedCallback>()

  connect(roomId: string, authorizedControllerId?: string | null) {
    if (this.channel && this.roomId === roomId) {
      if (authorizedControllerId !== undefined) {
        this.authorizedControllerId = authorizedControllerId
      }
      return
    }
    this.disconnect()

    this.roomId = roomId
    this.authorizedControllerId = authorizedControllerId ?? null
    this.lastSequence = 0
    this.channel = supabase
      .channel(`room_${roomId}_presentation`)
      .on('broadcast', { event: 'presentation_command' }, (message) => {
        const envelope = message.payload as PresentationCommandEnvelope
        if (!envelope || envelope.roomId !== this.roomId) return
        if (this.authorizedControllerId && envelope.senderDeviceId !== this.authorizedControllerId) return
        if (typeof envelope.sequence !== 'number' || envelope.sequence <= this.lastSequence) return
        if (!envelope.command || typeof envelope.command.type !== 'string') return
        this.lastSequence = envelope.sequence
        for (const callback of this.callbacks) callback(envelope.command)
      })
      .on('broadcast', { event: 'controller_connected' }, (message) => {
        const payload = message.payload as { deviceId: string; role: string }
        if (payload?.deviceId) {
          this.authorizedControllerId = payload.deviceId
          for (const cb of this.controllerConnectCallbacks) cb(payload)
        }
      })
      .subscribe()
  }

  setAuthorizedControllerId(id: string | null) {
    this.authorizedControllerId = id
  }

  disconnect() {
    if (this.channel) void supabase.removeChannel(this.channel)
    this.channel = null
    this.roomId = null
    this.authorizedControllerId = null
    this.lastSequence = 0
    this.callbacks.clear()
    this.controllerConnectCallbacks.clear()
  }

  async send(command: PresentationCommand) {
    if (!this.channel) return
    const roomId = this.roomId
    if (!roomId) return
    const envelope: PresentationCommandEnvelope = {
      roomId,
      senderDeviceId: getDeviceId(),
      sequence: ++this.sequence,
      command,
    }
    await this.channel.send({
      type: 'broadcast',
      event: 'presentation_command',
      payload: envelope,
    })
  }

  async broadcastControllerConnected(role: string = 'controller') {
    if (!this.channel || !this.roomId) return
    await this.channel.send({
      type: 'broadcast',
      event: 'controller_connected',
      payload: {
        roomId: this.roomId,
        deviceId: getDeviceId(),
        role,
      },
    })
  }

  subscribe(callback: CommandCallback) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  onControllerConnected(callback: ControllerConnectedCallback) {
    this.controllerConnectCallbacks.add(callback)
    return () => this.controllerConnectCallbacks.delete(callback)
  }
}

export const presentationRealtime = new PresentationRealtimeService()
