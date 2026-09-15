import { supabase } from '../lib/supabaseClient'

export interface PresentationRoom {
  id: string
  password: string
  owner_id: string
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export interface RoomState {
  id: string
  room_id: string
  current_song_id: number | null
  current_section_index: number
  current_slide_index: number
  live_song_id: number | null
  live_section_index: number
  live_slide_index: number
  is_live_active: boolean
  presentation_density: number
  updated_at: string
}

export interface RoomParticipant {
  id: string
  room_id: string
  device_id: string
  device_type: 'controller' | 'viewer'
  joined_at: string
  last_active: string
}

// Generate a human-readable room password (6-8 characters)
function generateRoomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 6 + Math.floor(Math.random() * 3) // 6-8 characters
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Generate a unique device ID for this browser
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('worship_runtime_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('worship_runtime_device_id', deviceId)
  }
  return deviceId
}

// Create a new presentation room
export async function createRoom(): Promise<{ room: PresentationRoom; password: string } | null> {
  try {
    const deviceId = getDeviceId()
    const password = generateRoomPassword()
    
    const { data: room, error } = await supabase.rpc('create_presentation_room', {
      p_password: password,
      p_owner_id: deviceId
    })
    
    if (error || !room) {
      console.error('Error creating room:', error)
      return null
    }
    
    // Store current room info in localStorage
    localStorage.setItem('worship_runtime_current_room_id', room.id)
    localStorage.setItem('worship_runtime_current_room_password', password)
    localStorage.setItem('worship_runtime_is_room_owner', 'true')
    localStorage.setItem('worship_runtime_room_owner_id', room.owner_id)
    
    return { room: room as PresentationRoom, password }
  } catch (error) {
    console.error('Error in createRoom:', error)
    return null
  }
}

// Join an existing room by password
export async function joinRoom(password: string, deviceType: 'controller' | 'viewer' = 'viewer'): Promise<PresentationRoom | null> {
  try {
    const deviceId = getDeviceId()
    
    console.log('Attempting to join room with password:', password)
    
    const { data: room, error } = await supabase.rpc('join_presentation_room', {
      p_password: password,
      p_device_id: deviceId,
      p_device_type: deviceType
    })
    
    if (error || !room) {
      console.error('Room not found or error:', error)
      return null
    }
    
    // Store current room info in localStorage
    localStorage.setItem('worship_runtime_current_room_id', room.id)
    localStorage.setItem('worship_runtime_current_room_password', password)
    localStorage.setItem('worship_runtime_is_room_owner', 'false')
    localStorage.setItem('worship_runtime_device_type', deviceType)
    localStorage.setItem('worship_runtime_room_owner_id', room.owner_id)
    
    console.log('Successfully joined room:', room.id)
    return room as PresentationRoom
  } catch (error) {
    console.error('Error in joinRoom:', error)
    return null
  }
}

// Leave current room
export async function leaveRoom(): Promise<void> {
  try {
    const roomId = localStorage.getItem('worship_runtime_current_room_id')
    const deviceId = getDeviceId()
    
    if (!roomId) return
    
    // Remove participant record via secure RPC
    await supabase.rpc('leave_presentation_room', {
      p_room_id: roomId,
      p_device_id: deviceId
    })
    
    // Clear local storage
    localStorage.removeItem('worship_runtime_current_room_id')
    localStorage.removeItem('worship_runtime_current_room_password')
    localStorage.removeItem('worship_runtime_is_room_owner')
    localStorage.removeItem('worship_runtime_device_type')
    localStorage.removeItem('worship_runtime_room_owner_id')
  } catch (error) {
    console.error('Error in leaveRoom:', error)
  }
}

// Get current room info from localStorage
export function getCurrentRoom(): { roomId: string | null; password: string | null; isOwner: boolean; deviceType: string | null; ownerDeviceId: string | null } {
  return {
    roomId: localStorage.getItem('worship_runtime_current_room_id'),
    password: localStorage.getItem('worship_runtime_current_room_password'),
    isOwner: localStorage.getItem('worship_runtime_is_room_owner') === 'true',
    deviceType: localStorage.getItem('worship_runtime_device_type'),
    ownerDeviceId: localStorage.getItem('worship_runtime_room_owner_id')
  }
}

// Get room state
export async function getRoomState(roomId: string): Promise<RoomState | null> {
  try {
    const { data, error } = await supabase
      .from('room_state')
      .select('*')
      .eq('room_id', roomId)
      .single()
    
    if (error) {
      console.error('Error getting room state:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getRoomState:', error)
    return null
  }
}

// Update room state (only room owner should do this)
export async function updateRoomState(roomId: string, updates: Partial<RoomState>): Promise<boolean> {
  try {
    const isOwner = localStorage.getItem('worship_runtime_is_room_owner') === 'true'
    
    if (!isOwner) {
      console.warn('Only room owner can update room state')
      return false
    }
    
    const deviceId = getDeviceId()
    const { data: success, error } = await supabase.rpc('update_presentation_state', {
      p_room_id: roomId,
      p_owner_id: deviceId,
      p_updates: updates
    })
    
    if (error || !success) {
      console.error('Error updating room state:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in updateRoomState:', error)
    return false
  }
}

// Subscribe to room state changes
export function subscribeToRoomState(
  roomId: string,
  callback: (state: RoomState) => void
): () => void {
  const channel = supabase
    .channel(`room_state_${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_state',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as RoomState)
        }
      }
    )
    .subscribe()
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

// End room (only owner can do this)
export async function endRoom(roomId: string): Promise<boolean> {
  try {
    const isOwner = localStorage.getItem('worship_runtime_is_room_owner') === 'true'
    
    if (!isOwner) {
      console.warn('Only room owner can end room')
      return false
    }
    
    const deviceId = getDeviceId()
    const { data: success, error } = await supabase.rpc('end_presentation_room', {
      p_room_id: roomId,
      p_owner_id: deviceId
    })
    
    if (error || !success) {
      console.error('Error ending room:', error)
      return false
    }
    
    // Leave the room
    await leaveRoom()
    
    return true
  } catch (error) {
    console.error('Error in endRoom:', error)
    return false
  }
}

// Get active room participants
export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

// Subscribe to room participants joining
export function subscribeToRoomParticipants(
  roomId: string,
  onParticipantJoined: (participant: RoomParticipant) => void
): () => void {
  const channel = supabase
    .channel(`room_participants_${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          onParticipantJoined(payload.new as RoomParticipant)
        }
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
