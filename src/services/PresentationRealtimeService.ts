import { supabase } from '../lib/supabaseClient'
import type { PresentationCommand } from '../types/PresentationCommand'
import type { PresentationCommandEnvelope } from '../types/PresentationCommand'
import { getDeviceId } from './RoomService'

type CommandCallback = (command: PresentationCommand) => void

class PresentationRealtimeService {
  private channel: ReturnType<typeof supabase.channel> | null = null
  private roomId: string | null = null
  private authorizedControllerId: string | null = null
  private lastSequence = 0
  private sequence = 0
  private callbacks = new Set<CommandCallback>()

  connect(roomId: string, authorizedControllerId?: string | null) {
    if (this.channel && this.roomId === roomId) return
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
      .subscribe()
  }

  disconnect() {
    if (this.channel) void supabase.removeChannel(this.channel)
    this.channel = null
    this.roomId = null
    this.authorizedControllerId = null
    this.lastSequence = 0
    this.callbacks.clear()
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

  subscribe(callback: CommandCallback) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }
}

export const presentationRealtime = new PresentationRealtimeService()
