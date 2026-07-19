# Presentation Rooms Database Schema

## Table: presentation_rooms

```sql
CREATE TABLE presentation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password TEXT UNIQUE NOT NULL, -- Human-readable 6-8 character password
  owner_id TEXT NOT NULL, -- Device identifier of the room owner
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  is_active BOOLEAN DEFAULT true
);

-- Index for quick password lookup
CREATE INDEX idx_presentation_rooms_password ON presentation_rooms(password);
CREATE INDEX idx_presentation_rooms_active ON presentation_rooms(is_active) WHERE is_active = true;
```

## Table: room_state

```sql
CREATE TABLE room_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES presentation_rooms(id) ON DELETE CASCADE,
  current_song_id INTEGER,
  current_section_index INTEGER DEFAULT 0,
  current_slide_index INTEGER DEFAULT 0,
  live_song_id INTEGER,
  live_section_index INTEGER DEFAULT 0,
  live_slide_index INTEGER DEFAULT 0,
  is_live_active BOOLEAN DEFAULT false,
  presentation_density INTEGER DEFAULT 4,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_id) -- One state per room
);

-- Index for room lookups
CREATE INDEX idx_room_state_room_id ON room_state(room_id);
```

## Table: room_participants

```sql
CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES presentation_rooms(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'controller' or 'viewer'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for participant tracking
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_device_id ON room_participants(device_id);
```

## Realtime Subscriptions

Enable realtime on:
- `room_state` table for live presentation updates
- `presentation_rooms` table for room status changes

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE presentation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active rooms (for joining)
CREATE POLICY "Anyone can read active rooms"
  ON presentation_rooms FOR SELECT
  USING (is_active = true);

-- Allow anyone to read room state
CREATE POLICY "Anyone can read room state"
  ON room_state FOR SELECT
  USING (true);

-- Allow anyone to insert room state (will be restricted by app logic)
CREATE POLICY "Anyone can insert room state"
  ON room_state FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update room state (will be restricted by app logic)
CREATE POLICY "Anyone can update room state"
  ON room_state FOR UPDATE
  USING (true);

-- Allow anyone to manage participants
CREATE POLICY "Anyone can manage participants"
  ON room_participants FOR ALL
  USING (true);
```

## Sample SQL for Setup

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS presentation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS room_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES presentation_rooms(id) ON DELETE CASCADE,
  current_song_id INTEGER,
  current_section_index INTEGER DEFAULT 0,
  current_slide_index INTEGER DEFAULT 0,
  live_song_id INTEGER,
  live_section_index INTEGER DEFAULT 0,
  live_slide_index INTEGER DEFAULT 0,
  is_live_active BOOLEAN DEFAULT false,
  presentation_density INTEGER DEFAULT 4,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id)
);

CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES presentation_rooms(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_type TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_presentation_rooms_password ON presentation_rooms(password);
CREATE INDEX IF NOT EXISTS idx_presentation_rooms_active ON presentation_rooms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_room_state_room_id ON room_state(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_device_id ON room_participants(device_id);

-- Enable RLS
ALTER TABLE presentation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read active rooms"
  ON presentation_rooms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can insert rooms"
  ON presentation_rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
  ON presentation_rooms FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can read room state"
  ON room_state FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert room state"
  ON room_state FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update room state"
  ON room_state FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can manage participants"
  ON room_participants FOR ALL
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE presentation_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_state;
```
