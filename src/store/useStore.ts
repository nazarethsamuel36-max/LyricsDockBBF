import { create } from 'zustand'
import type { SetlistItem } from '../db/Database'
import { getCurrentRoom, updateRoomState } from '../services/RoomService'

// BroadcastChannel for cross-tab synchronization
const channel = new BroadcastChannel('worship-runtime-state')
let isBroadcasting = false // Prevent infinite loops

interface StoreState {
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setlist: SetlistItem[];
  setSetlist: (items: SetlistItem[]) => void;
  addToSetlist: (item: SetlistItem) => void;
  removeFromSetlist: (id: string) => void;
  reorderSetlist: (fromIndex: number, toIndex: number) => void;
  currentSongId: number | null;
  setCurrentSongId: (id: number | null) => void;
  currentSectionIndex: number;
  currentSlideIndex: number;
  setCurrentSectionIndex: (index: number) => void;
  setCurrentSlideIndex: (index: number) => void;
  resetPresentation: () => void;
  presentationDensity: 4 | 2;
  setPresentationDensity: (density: 4 | 2) => void;
  
  // Live states
  liveSongId: number | null;
  liveSectionIndex: number;
  liveSlideIndex: number;
  setLiveSlide: (songId: number | null, sectionIndex: number, slideIndex: number) => void;
  isLiveActive: boolean;
  setIsLiveActive: (active: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  selectedLanguage: 'All',
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setlist: [],
  setSetlist: (items) => set({ setlist: items }),
  addToSetlist: (item) => set((state) => ({ setlist: [...state.setlist, item] })),
  removeFromSetlist: (id) => set((state) => ({ setlist: state.setlist.filter((item) => item.id !== id) })),
  reorderSetlist: (fromIndex, toIndex) => set((state) => {
    const newSetlist = [...state.setlist];
    const [removed] = newSetlist.splice(fromIndex, 1);
    newSetlist.splice(toIndex, 0, removed);
    return { setlist: newSetlist };
  }),
  currentSongId: null,
  setCurrentSongId: (id) => {
    set({ currentSongId: id })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { current_song_id: id })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'currentSongId', value: id })
    }
  },
  currentSectionIndex: 0,
  currentSlideIndex: 0,
  setCurrentSectionIndex: (index) => {
    set({ currentSectionIndex: index })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { current_section_index: index })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'currentSectionIndex', value: index })
    }
  },
  setCurrentSlideIndex: (index) => {
    set({ currentSlideIndex: index })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { current_slide_index: index })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'currentSlideIndex', value: index })
    }
  },
  resetPresentation: () => {
    set({ currentSectionIndex: 0, currentSlideIndex: 0 })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { current_section_index: 0, current_slide_index: 0 })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'resetPresentation' })
    }
  },
  presentationDensity: 4,
  setPresentationDensity: (density) => {
    set({ presentationDensity: density })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { presentation_density: density })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'presentationDensity', value: density })
    }
  },

  // Live states
  liveSongId: null,
  liveSectionIndex: 0,
  liveSlideIndex: 0,
  setLiveSlide: (songId, sectionIndex, slideIndex) => {
    set({ liveSongId: songId, liveSectionIndex: sectionIndex, liveSlideIndex: slideIndex })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { 
        live_song_id: songId, 
        live_section_index: sectionIndex, 
        live_slide_index: slideIndex 
      })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'liveSlide', value: { songId, sectionIndex, slideIndex } })
    }
  },
  isLiveActive: false,
  setIsLiveActive: (active) => {
    set({ isLiveActive: active })
    
    // Broadcast to room if active
    const { roomId, isOwner } = getCurrentRoom()
    if (roomId && isOwner) {
      updateRoomState(roomId, { is_live_active: active })
    }
    
    if (!isBroadcasting) {
      channel.postMessage({ type: 'isLiveActive', value: active })
    }
  },
}))

// Listen for BroadcastChannel messages and update store
channel.onmessage = (event) => {
  const { type, value } = event.data
  isBroadcasting = true
  
  switch (type) {
    case 'currentSongId':
      useStore.getState().setCurrentSongId(value)
      break
    case 'currentSectionIndex':
      useStore.getState().setCurrentSectionIndex(value)
      break
    case 'currentSlideIndex':
      useStore.getState().setCurrentSlideIndex(value)
      break
    case 'resetPresentation':
      useStore.getState().resetPresentation()
      break
    case 'presentationDensity':
      useStore.getState().setPresentationDensity(value)
      break
    case 'liveSlide':
      useStore.getState().setLiveSlide(value.songId, value.sectionIndex, value.slideIndex)
      break
    case 'isLiveActive':
      useStore.getState().setIsLiveActive(value)
      break
  }
  
  isBroadcasting = false
}
