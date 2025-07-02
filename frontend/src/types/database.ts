// Database types for Supabase schema
export type Database = {
  public: {
    Tables: {
      feedback_submissions: {
        Row: {
          id: string
          question: string
          ai_response: string
          feedback_type: 'correct' | 'incorrect' | 'needs_improvement'
          user_session_id: string
          created_at: string
          status: 'pending' | 'in_progress' | 'completed'
          assigned_to: string | null
          category_attempted: string | null
        }
        Insert: {
          id?: string
          question: string
          ai_response: string
          feedback_type: 'correct' | 'incorrect' | 'needs_improvement'
          user_session_id: string
          created_at?: string
          status?: 'pending' | 'in_progress' | 'completed'
          assigned_to?: string | null
          category_attempted?: string | null
        }
        Update: {
          id?: string
          question?: string
          ai_response?: string
          feedback_type?: 'correct' | 'incorrect' | 'needs_improvement'
          user_session_id?: string
          created_at?: string
          status?: 'pending' | 'in_progress' | 'completed'
          assigned_to?: string | null
          category_attempted?: string | null
        }
      }
      kb_articles_draft: {
        Row: {
          id: string
          feedback_id: string
          title: string
          content: string
          category_id: number | null
          subcategory_id: number | null
          created_by: string
          created_at: string
          published_at: string | null
          freshdesk_article_id: string | null
        }
        Insert: {
          id?: string
          feedback_id: string
          title: string
          content: string
          category_id?: number | null
          subcategory_id?: number | null
          created_by: string
          created_at?: string
          published_at?: string | null
          freshdesk_article_id?: string | null
        }
        Update: {
          id?: string
          feedback_id?: string
          title?: string
          content?: string
          category_id?: number | null
          subcategory_id?: number | null
          created_by?: string
          created_at?: string
          published_at?: string | null
          freshdesk_article_id?: string | null
        }
      }
    }
    Views: {
      feedback_with_users: {
        Row: {
          id: string
          question: string
          ai_response: string
          feedback_type: 'correct' | 'incorrect' | 'needs_improvement'
          user_session_id: string
          created_at: string
          status: 'pending' | 'in_progress' | 'completed'
          assigned_to: string | null
          category_attempted: string | null
          assigned_to_email: string | null
          assigned_to_name: string | null
        }
      }
      draft_articles_with_feedback: {
        Row: {
          id: string
          feedback_id: string
          title: string
          content: string
          category_id: number | null
          subcategory_id: number | null
          created_by: string
          created_at: string
          published_at: string | null
          freshdesk_article_id: string | null
          question: string
          feedback_type: 'correct' | 'incorrect' | 'needs_improvement'
          user_session_id: string
          created_by_email: string | null
          created_by_name: string | null
        }
      }
    }
    Functions: {
      get_feedback_stats: {
        Args: {}
        Returns: {
          total_feedback: number
          pending_feedback: number
          in_progress_feedback: number
          completed_feedback: number
          correct_feedback: number
          incorrect_feedback: number
          needs_improvement_feedback: number
        }[]
      }
      get_my_assigned_feedback: {
        Args: {}
        Returns: Database['public']['Tables']['feedback_submissions']['Row'][]
      }
      assign_feedback: {
        Args: {
          feedback_id: string
          user_id?: string | null
        }
        Returns: boolean
      }
    }
  }
}

// Type aliases for easier use
export type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row']
export type FeedbackSubmissionInsert = Database['public']['Tables']['feedback_submissions']['Insert']
export type FeedbackSubmissionUpdate = Database['public']['Tables']['feedback_submissions']['Update']

export type KbArticleDraft = Database['public']['Tables']['kb_articles_draft']['Row']
export type KbArticleDraftInsert = Database['public']['Tables']['kb_articles_draft']['Insert']
export type KbArticleDraftUpdate = Database['public']['Tables']['kb_articles_draft']['Update']

export type FeedbackWithUsers = Database['public']['Views']['feedback_with_users']['Row']
export type DraftArticleWithFeedback = Database['public']['Views']['draft_articles_with_feedback']['Row']

export type FeedbackType = 'correct' | 'incorrect' | 'needs_improvement'
export type FeedbackStatus = 'pending' | 'in_progress' | 'completed'

export type FeedbackStats = {
  total_feedback: number
  pending_feedback: number
  in_progress_feedback: number
  completed_feedback: number
  correct_feedback: number
  incorrect_feedback: number
  needs_improvement_feedback: number
} 