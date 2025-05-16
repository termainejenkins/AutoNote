export interface Note {
  id: number;
  title: string;
  content: string;
  source_url?: string;
  source_type: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface NotesState {
  items: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
}