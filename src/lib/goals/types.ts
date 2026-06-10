export type GoalStatus = 'active' | 'in_progress' | 'achieved' | 'discontinued' | 'revised'
export type GoalCategory = 'clinical' | 'behavioral' | 'developmental' | 'social' | 'communication' | 'daily_living' | 'employment' | 'education' | 'health' | 'other'

export type Goal = {
  id: string
  organization_id: string
  client_id: string
  title: string
  description: string | null
  category: GoalCategory
  status: GoalStatus
  target_date: string | null
  start_date: string | null
  achieved_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  goal_progress?: GoalProgress[]
}

export type GoalProgress = {
  id: string
  goal_id: string
  packet_form_id: string | null
  progress_note: string
  progress_score: number | null
  recorded_by: string
  recorded_at: string
}

export type GoalStats = {
  active: number
  in_progress: number
  achieved: number
  total: number
}
