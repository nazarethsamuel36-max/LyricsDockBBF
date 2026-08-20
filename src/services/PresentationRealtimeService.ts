import { supabase } from '../lib/supabaseClient'
import type { PresentationCommand } from '../types/PresentationCommand'

type CommandCallback = (command: PresentationCommand) => void

class PresentationRealtimeService {
  private channel: ReturnType<typeof supabase.channel> | null = null
  private roomId: string | null = null
  private callbacks = new Set<CommandCallback>()

  connect(roomId: string) {
    if (this.channel && this.roomId === roomId) return
    this.disconnect()

    this.roomId = roomId
    this.channel = supabase
      .channel(`room_${roomId}_presentation`)
      .on('broadcast', { event: 'presentation_command' }, (message) => {
        const command = message.payload as PresentationCommand
        if (!command || typeof command.type !== 'string') return
        for (const callback of this.callbacks) callback(command)
      })
      .subscribe()
  }

  disconnect() {
    if (this.channel) void supabase.removeChannel(this.channel)
    this.channel = null
    this.roomId = null
    this.callbacks.clear()
  }

  async send(command: PresentationCommand) {
    if (!this.channel) return
    await this.channel.send({
      type: 'broadcast',
      event: 'presentation_command',
      payload: command,
    })
  }

  subscribe(callback: CommandCallback) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }
}

export const presentationRealtime = new PresentationRealtimeService()
