export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abastecimento_caixa_dagua: {
        Row: {
          ano: number
          created_at: string
          created_by: string
          environment: string
          id: string
          kg: number
          mes: number
          semana: number
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          kg?: number
          mes: number
          semana: number
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          kg?: number
          mes?: number
          semana?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      adubo_estoque: {
        Row: {
          created_at: string
          environment: string
          id: string
          quantity: number
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          quantity?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          quantity?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      adubo_movimentos: {
        Row: {
          created_at: string
          environment: string
          id: string
          movement_type: string
          new_quantity: number
          previous_quantity: number
          quantity: number
          reason: string | null
          receipt_data_url: string | null
          registered_by: string
          registered_by_name: string | null
          signature_data_url: string | null
          unit: string
          withdrawer_name: string | null
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          movement_type: string
          new_quantity?: number
          previous_quantity?: number
          quantity: number
          reason?: string | null
          receipt_data_url?: string | null
          registered_by: string
          registered_by_name?: string | null
          signature_data_url?: string | null
          unit?: string
          withdrawer_name?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          movement_type?: string
          new_quantity?: number
          previous_quantity?: number
          quantity?: number
          reason?: string | null
          receipt_data_url?: string | null
          registered_by?: string
          registered_by_name?: string | null
          signature_data_url?: string | null
          unit?: string
          withdrawer_name?: string | null
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          environment: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          environment?: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          environment?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          environment: string
          id: string
          image_url: string | null
          published_at: string | null
          scheduled_at: string | null
          target_type: string
          target_users: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          target_type?: string
          target_users?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          target_type?: string
          target_users?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      aspersores_annotations: {
        Row: {
          created_at: string
          data: Json
          environment: string
          id: string
          page: number
          report_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          environment: string
          id?: string
          page?: number
          report_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          environment?: string
          id?: string
          page?: number
          report_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      aspersores_annotations_history: {
        Row: {
          annotation_id: string | null
          data: Json | null
          environment: string | null
          id: string
          page: number | null
          report_date: string | null
          snapshot_at: string
          updated_by: string | null
        }
        Insert: {
          annotation_id?: string | null
          data?: Json | null
          environment?: string | null
          id?: string
          page?: number | null
          report_date?: string | null
          snapshot_at?: string
          updated_by?: string | null
        }
        Update: {
          annotation_id?: string | null
          data?: Json | null
          environment?: string | null
          id?: string
          page?: number | null
          report_date?: string | null
          snapshot_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      aspersores_consertos: {
        Row: {
          count: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          environment: string
          id: string
          notes: string | null
          report_date: string
        }
        Insert: {
          count?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          environment: string
          id?: string
          notes?: string | null
          report_date?: string
        }
        Update: {
          count?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          environment?: string
          id?: string
          notes?: string | null
          report_date?: string
        }
        Relationships: []
      }
      attendance_absence_reasons: {
        Row: {
          cid: string | null
          created_at: string
          created_by: string | null
          date: string
          days_count: number
          employee_id: string
          environment: string
          id: string
          notes: string | null
          reason: string
          updated_at: string
        }
        Insert: {
          cid?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          days_count?: number
          employee_id: string
          environment?: string
          id?: string
          notes?: string | null
          reason: string
          updated_at?: string
        }
        Update: {
          cid?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          days_count?: number
          employee_id?: string
          environment?: string
          id?: string
          notes?: string | null
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_area_assignments: {
        Row: {
          area: string
          created_at: string
          employee_id: number
          employee_name: string
          environment: string
          id: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          employee_id: number
          employee_name: string
          environment?: string
          id?: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          employee_id?: number
          employee_name?: string
          environment?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_daily_marks: {
        Row: {
          absent_employee_ids: number[]
          area: string
          created_at: string
          created_by: string | null
          date: string
          environment: string
          external_work_employee_ids: number[] | null
          id: string
          updated_at: string
        }
        Insert: {
          absent_employee_ids?: number[]
          area: string
          created_at?: string
          created_by?: string | null
          date: string
          environment?: string
          external_work_employee_ids?: number[] | null
          id?: string
          updated_at?: string
        }
        Update: {
          absent_employee_ids?: number[]
          area?: string
          created_at?: string
          created_by?: string | null
          date?: string
          environment?: string
          external_work_employee_ids?: number[] | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          environment: string
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          environment?: string
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          environment?: string
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_report_locks: {
        Row: {
          area: string
          created_at: string
          date: string
          environment: string
          id: string
          locked_at: string
          locked_by: string
        }
        Insert: {
          area?: string
          created_at?: string
          date: string
          environment?: string
          id?: string
          locked_at?: string
          locked_by: string
        }
        Update: {
          area?: string
          created_at?: string
          date?: string
          environment?: string
          id?: string
          locked_at?: string
          locked_by?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          created_at: string
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      aviator_balances: {
        Row: {
          balance: number
          created_at: string
          environment: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aviator_bets: {
        Row: {
          avatar_url: string | null
          bet_amount: number
          cashed_out_at: number | null
          created_at: string
          environment: string
          id: string
          payout: number | null
          round_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          avatar_url?: string | null
          bet_amount: number
          cashed_out_at?: number | null
          created_at?: string
          environment?: string
          id?: string
          payout?: number | null
          round_id: string
          user_id: string
          user_name: string
        }
        Update: {
          avatar_url?: string | null
          bet_amount?: number
          cashed_out_at?: number | null
          created_at?: string
          environment?: string
          id?: string
          payout?: number | null
          round_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "aviator_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "aviator_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      aviator_rounds: {
        Row: {
          crash_point: number
          crashed_at: string | null
          created_at: string
          environment: string
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          crash_point: number
          crashed_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          crash_point?: number
          crashed_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      backup_audit_log: {
        Row: {
          action: string
          backup_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          backup_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          backup_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_audit_log_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_path: string | null
          drive_root_id: string | null
          drive_web_view_link: string | null
          error_message: string | null
          failed_files: Json
          file_count: number | null
          finished_at: string | null
          id: string
          include_storage: boolean
          kind: string
          last_progress_at: string | null
          manifest_drive_id: string | null
          manifest_web_link: string | null
          pending_buckets: Json
          sha256: string | null
          size_bytes: number | null
          stage: string
          stamp: string | null
          started_at: string
          status: string
          table_count: number | null
          updated_at: string
          uploaded_segments: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_path?: string | null
          drive_root_id?: string | null
          drive_web_view_link?: string | null
          error_message?: string | null
          failed_files?: Json
          file_count?: number | null
          finished_at?: string | null
          id?: string
          include_storage?: boolean
          kind: string
          last_progress_at?: string | null
          manifest_drive_id?: string | null
          manifest_web_link?: string | null
          pending_buckets?: Json
          sha256?: string | null
          size_bytes?: number | null
          stage?: string
          stamp?: string | null
          started_at?: string
          status?: string
          table_count?: number | null
          updated_at?: string
          uploaded_segments?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_path?: string | null
          drive_root_id?: string | null
          drive_web_view_link?: string | null
          error_message?: string | null
          failed_files?: Json
          file_count?: number | null
          finished_at?: string | null
          id?: string
          include_storage?: boolean
          kind?: string
          last_progress_at?: string | null
          manifest_drive_id?: string | null
          manifest_web_link?: string | null
          pending_buckets?: Json
          sha256?: string | null
          size_bytes?: number | null
          stage?: string
          stamp?: string | null
          started_at?: string
          status?: string
          table_count?: number | null
          updated_at?: string
          uploaded_segments?: Json
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          audio_url: string | null
          content: string | null
          created_at: string
          delivered_at: string | null
          id: string
          image_url: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      chat_notification_logs: {
        Row: {
          id: string
          message_id: string | null
          receiver_id: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          receiver_id?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          receiver_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_notification_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      checkers_games: {
        Row: {
          board: Json
          captured_black: number
          captured_white: number
          created_at: string
          current_turn: string
          environment: string
          id: string
          last_move: Json | null
          player1_avatar_url: string | null
          player1_color: string
          player1_id: string
          player1_name: string
          player1_piece_style: Json | null
          player2_avatar_url: string | null
          player2_id: string | null
          player2_name: string | null
          player2_piece_style: Json | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          board?: Json
          captured_black?: number
          captured_white?: number
          created_at?: string
          current_turn?: string
          environment?: string
          id?: string
          last_move?: Json | null
          player1_avatar_url?: string | null
          player1_color?: string
          player1_id: string
          player1_name: string
          player1_piece_style?: Json | null
          player2_avatar_url?: string | null
          player2_id?: string | null
          player2_name?: string | null
          player2_piece_style?: Json | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          board?: Json
          captured_black?: number
          captured_white?: number
          created_at?: string
          current_turn?: string
          environment?: string
          id?: string
          last_move?: Json | null
          player1_avatar_url?: string | null
          player1_color?: string
          player1_id?: string
          player1_name?: string
          player1_piece_style?: Json | null
          player2_avatar_url?: string | null
          player2_id?: string | null
          player2_name?: string | null
          player2_piece_style?: Json | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      checkers_stats: {
        Row: {
          avatar_url: string | null
          created_at: string
          environment: string
          id: string
          losses: number
          updated_at: string
          user_id: string
          user_name: string
          wins: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          environment?: string
          id?: string
          losses?: number
          updated_at?: string
          user_id: string
          user_name: string
          wins?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          environment?: string
          id?: string
          losses?: number
          updated_at?: string
          user_id?: string
          user_name?: string
          wins?: number
        }
        Relationships: []
      }
      cipa_atas: {
        Row: {
          assuntos: string | null
          created_at: string
          created_by: string | null
          file_name: string | null
          file_url: string | null
          id: string
          meeting_date: string
          observacoes: string | null
          participantes: string | null
          pendencias: string | null
          responsavel: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assuntos?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          meeting_date: string
          observacoes?: string | null
          participantes?: string | null
          pendencias?: string | null
          responsavel?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assuntos?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          meeting_date?: string
          observacoes?: string | null
          participantes?: string | null
          pendencias?: string | null
          responsavel?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cipa_dds: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          dds_date: string | null
          descricao: string | null
          file_name: string | null
          file_url: string | null
          id: string
          responsavel: string | null
          title: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          dds_date?: string | null
          descricao?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          responsavel?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          dds_date?: string | null
          descricao?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          responsavel?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cipa_president: {
        Row: {
          cargo: string | null
          created_at: string
          foto_url: string | null
          id: string
          is_current: boolean
          mandato_fim: string | null
          mandato_inicio: string | null
          nome: string
          setor: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          is_current?: boolean
          mandato_fim?: string | null
          mandato_inicio?: string | null
          nome: string
          setor?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          is_current?: boolean
          mandato_fim?: string | null
          mandato_inicio?: string | null
          nome?: string
          setor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cipa_responsaveis: {
        Row: {
          cargo: string | null
          created_at: string
          email: string | null
          foto_url: string | null
          funcao: string | null
          id: string
          nome: string
          setor: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          nome: string
          setor?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          setor?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cronograma_mirante: {
        Row: {
          atividade_key: string
          created_at: string
          datas: Json
          environment: string
          id: string
          updated_at: string
        }
        Insert: {
          atividade_key: string
          created_at?: string
          datas?: Json
          environment?: string
          id?: string
          updated_at?: string
        }
        Update: {
          atividade_key?: string
          created_at?: string
          datas?: Json
          environment?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cronograma_mirante_historico: {
        Row: {
          archived_at: string
          atividade_key: string
          ciclo_label: string | null
          created_at: string
          datas: Json
          environment: string
          id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string
          atividade_key: string
          ciclo_label?: string | null
          created_at?: string
          datas?: Json
          environment?: string
          id?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string
          atividade_key?: string
          ciclo_label?: string | null
          created_at?: string
          datas?: Json
          environment?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_activity_daily_reports: {
        Row: {
          created_at: string
          created_by: string | null
          definition_id: string
          entries: Json
          environment: string
          id: string
          locked: boolean
          report_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition_id: string
          entries?: Json
          environment?: string
          id?: string
          locked?: boolean
          report_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition_id?: string
          entries?: Json
          environment?: string
          id?: string
          locked?: boolean
          report_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_activity_daily_reports_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_activity_definitions: {
        Row: {
          color: string
          config: Json
          created_at: string
          created_by: string | null
          environment: string
          icon: string
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          environment?: string
          icon?: string
          id?: string
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          environment?: string
          icon?: string
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_gabiao_reports: {
        Row: {
          created_at: string
          created_by: string
          environment: string
          id: string
          limpeza_bueiro_berma: number | null
          limpeza_bueiro_unidade: number | null
          limpeza_canaleta_berma: number | null
          limpeza_canaleta_m: number | null
          local_servico: string
          manutencao_drenagem_berma: number | null
          manutencao_drenagem_m: number | null
          observacoes: string | null
          photo_urls: string[] | null
          recomposicao_gabiao_berma: number | null
          recomposicao_gabiao_m: number | null
          reparo_cerca_berma: number | null
          reparo_cerca_m: number | null
          report_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          limpeza_bueiro_berma?: number | null
          limpeza_bueiro_unidade?: number | null
          limpeza_canaleta_berma?: number | null
          limpeza_canaleta_m?: number | null
          local_servico: string
          manutencao_drenagem_berma?: number | null
          manutencao_drenagem_m?: number | null
          observacoes?: string | null
          photo_urls?: string[] | null
          recomposicao_gabiao_berma?: number | null
          recomposicao_gabiao_m?: number | null
          reparo_cerca_berma?: number | null
          reparo_cerca_m?: number | null
          report_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          limpeza_bueiro_berma?: number | null
          limpeza_bueiro_unidade?: number | null
          limpeza_canaleta_berma?: number | null
          limpeza_canaleta_m?: number | null
          local_servico?: string
          manutencao_drenagem_berma?: number | null
          manutencao_drenagem_m?: number | null
          observacoes?: string | null
          photo_urls?: string[] | null
          recomposicao_gabiao_berma?: number | null
          recomposicao_gabiao_m?: number | null
          reparo_cerca_berma?: number | null
          reparo_cerca_m?: number | null
          report_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_jardinagem_reports: {
        Row: {
          adubagem_berma: string | null
          adubagem_faixa: string | null
          adubagem_unidade: number | null
          atividades_manuais: string | null
          atividades_manuais_berma: string | null
          atividades_manuais_faixa: string | null
          controle_invasoras_berma: string | null
          controle_invasoras_faixa: string | null
          controle_invasoras_nome: string | null
          controle_invasoras_unidade: number | null
          coroamento_berma: string | null
          coroamento_faixa: string | null
          coroamento_unidade: number | null
          cova_berma: string | null
          cova_faixa: string | null
          cova_unidade: number | null
          created_at: string
          created_by: string
          environment: string
          extra_entries: Json | null
          id: string
          irrigacao_carretel: boolean | null
          irrigacao_carretel_bermas: number[] | null
          irrigacao_pipas: boolean | null
          limpeza_assoprador_berma: string | null
          limpeza_assoprador_faixa: string | null
          limpeza_assoprador_m2: number | null
          limpeza_manual_berma: string | null
          limpeza_manual_faixa: string | null
          limpeza_manual_m2: number | null
          local_faixa: string
          manutencao_canteiro: string | null
          manutencao_canteiro_berma: string | null
          manutencao_canteiro_faixa: string | null
          photo_urls: string[] | null
          plantio_berma: string | null
          plantio_especie: string | null
          plantio_faixa: string | null
          plantio_grama_berma: string | null
          plantio_grama_faixa: string | null
          plantio_grama_m2: number | null
          plantio_unidade: number | null
          podagem_berma: string | null
          podagem_faixa: string | null
          podagem_unidade: number | null
          report_date: string
          retirada_mudas_berma: string | null
          retirada_mudas_faixa: string | null
          retirada_mudas_unidade: number | null
          rocagem_berma: string | null
          rocagem_faixa: string | null
          rocagem_m2: number | null
          updated_at: string
        }
        Insert: {
          adubagem_berma?: string | null
          adubagem_faixa?: string | null
          adubagem_unidade?: number | null
          atividades_manuais?: string | null
          atividades_manuais_berma?: string | null
          atividades_manuais_faixa?: string | null
          controle_invasoras_berma?: string | null
          controle_invasoras_faixa?: string | null
          controle_invasoras_nome?: string | null
          controle_invasoras_unidade?: number | null
          coroamento_berma?: string | null
          coroamento_faixa?: string | null
          coroamento_unidade?: number | null
          cova_berma?: string | null
          cova_faixa?: string | null
          cova_unidade?: number | null
          created_at?: string
          created_by: string
          environment?: string
          extra_entries?: Json | null
          id?: string
          irrigacao_carretel?: boolean | null
          irrigacao_carretel_bermas?: number[] | null
          irrigacao_pipas?: boolean | null
          limpeza_assoprador_berma?: string | null
          limpeza_assoprador_faixa?: string | null
          limpeza_assoprador_m2?: number | null
          limpeza_manual_berma?: string | null
          limpeza_manual_faixa?: string | null
          limpeza_manual_m2?: number | null
          local_faixa: string
          manutencao_canteiro?: string | null
          manutencao_canteiro_berma?: string | null
          manutencao_canteiro_faixa?: string | null
          photo_urls?: string[] | null
          plantio_berma?: string | null
          plantio_especie?: string | null
          plantio_faixa?: string | null
          plantio_grama_berma?: string | null
          plantio_grama_faixa?: string | null
          plantio_grama_m2?: number | null
          plantio_unidade?: number | null
          podagem_berma?: string | null
          podagem_faixa?: string | null
          podagem_unidade?: number | null
          report_date?: string
          retirada_mudas_berma?: string | null
          retirada_mudas_faixa?: string | null
          retirada_mudas_unidade?: number | null
          rocagem_berma?: string | null
          rocagem_faixa?: string | null
          rocagem_m2?: number | null
          updated_at?: string
        }
        Update: {
          adubagem_berma?: string | null
          adubagem_faixa?: string | null
          adubagem_unidade?: number | null
          atividades_manuais?: string | null
          atividades_manuais_berma?: string | null
          atividades_manuais_faixa?: string | null
          controle_invasoras_berma?: string | null
          controle_invasoras_faixa?: string | null
          controle_invasoras_nome?: string | null
          controle_invasoras_unidade?: number | null
          coroamento_berma?: string | null
          coroamento_faixa?: string | null
          coroamento_unidade?: number | null
          cova_berma?: string | null
          cova_faixa?: string | null
          cova_unidade?: number | null
          created_at?: string
          created_by?: string
          environment?: string
          extra_entries?: Json | null
          id?: string
          irrigacao_carretel?: boolean | null
          irrigacao_carretel_bermas?: number[] | null
          irrigacao_pipas?: boolean | null
          limpeza_assoprador_berma?: string | null
          limpeza_assoprador_faixa?: string | null
          limpeza_assoprador_m2?: number | null
          limpeza_manual_berma?: string | null
          limpeza_manual_faixa?: string | null
          limpeza_manual_m2?: number | null
          local_faixa?: string
          manutencao_canteiro?: string | null
          manutencao_canteiro_berma?: string | null
          manutencao_canteiro_faixa?: string | null
          photo_urls?: string[] | null
          plantio_berma?: string | null
          plantio_especie?: string | null
          plantio_faixa?: string | null
          plantio_grama_berma?: string | null
          plantio_grama_faixa?: string | null
          plantio_grama_m2?: number | null
          plantio_unidade?: number | null
          podagem_berma?: string | null
          podagem_faixa?: string | null
          podagem_unidade?: number | null
          report_date?: string
          retirada_mudas_berma?: string | null
          retirada_mudas_faixa?: string | null
          retirada_mudas_unidade?: number | null
          rocagem_berma?: string | null
          rocagem_faixa?: string | null
          rocagem_m2?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_shift_records: {
        Row: {
          client_op_id: string | null
          created_at: string
          driver_name: string
          environment: string
          equipment_id: string
          equipment_name: string
          final_fuel_level: string | null
          final_horimeter: number | null
          final_km: number | null
          helper_name: string | null
          id: string
          initial_fuel_level: string | null
          initial_horimeter: number | null
          initial_km: number | null
          plate: string
          refueling_points: Json | null
          shift_date: string
          shift_end_time: string | null
          shift_start_time: string | null
          status_history: Json | null
          updated_at: string
        }
        Insert: {
          client_op_id?: string | null
          created_at?: string
          driver_name: string
          environment?: string
          equipment_id: string
          equipment_name: string
          final_fuel_level?: string | null
          final_horimeter?: number | null
          final_km?: number | null
          helper_name?: string | null
          id?: string
          initial_fuel_level?: string | null
          initial_horimeter?: number | null
          initial_km?: number | null
          plate: string
          refueling_points?: Json | null
          shift_date?: string
          shift_end_time?: string | null
          shift_start_time?: string | null
          status_history?: Json | null
          updated_at?: string
        }
        Update: {
          client_op_id?: string | null
          created_at?: string
          driver_name?: string
          environment?: string
          equipment_id?: string
          equipment_name?: string
          final_fuel_level?: string | null
          final_horimeter?: number | null
          final_km?: number | null
          helper_name?: string | null
          id?: string
          initial_fuel_level?: string | null
          initial_horimeter?: number | null
          initial_km?: number | null
          plate?: string
          refueling_points?: Json | null
          shift_date?: string
          shift_end_time?: string | null
          shift_start_time?: string | null
          status_history?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_shift_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      dds_participation: {
        Row: {
          absence_reason: string | null
          created_at: string
          dds_date: string
          employee_name: string
          environment: string
          id: string
          present: boolean
          saved_by: string
          updated_at: string
        }
        Insert: {
          absence_reason?: string | null
          created_at?: string
          dds_date: string
          employee_name: string
          environment?: string
          id?: string
          present?: boolean
          saved_by: string
          updated_at?: string
        }
        Update: {
          absence_reason?: string | null
          created_at?: string
          dds_date?: string
          employee_name?: string
          environment?: string
          id?: string
          present?: boolean
          saved_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      dds_participation_locks: {
        Row: {
          created_at: string
          dds_date: string
          environment: string
          id: string
          locked_by: string
          locked_by_name: string
        }
        Insert: {
          created_at?: string
          dds_date: string
          environment?: string
          id?: string
          locked_by: string
          locked_by_name: string
        }
        Update: {
          created_at?: string
          dds_date?: string
          environment?: string
          id?: string
          locked_by?: string
          locked_by_name?: string
        }
        Relationships: []
      }
      dds_planning_document: {
        Row: {
          environment: string
          file_name: string
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          environment?: string
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          environment?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      dds_schedule: {
        Row: {
          created_at: string
          created_by: string
          environment: string
          event_photo_url: string | null
          external_presenter_name: string | null
          id: string
          month_year: string
          photo_url: string | null
          presenter_user_id: string | null
          scheduled_date: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          environment?: string
          event_photo_url?: string | null
          external_presenter_name?: string | null
          id?: string
          month_year: string
          photo_url?: string | null
          presenter_user_id?: string | null
          scheduled_date: string
          theme: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          environment?: string
          event_photo_url?: string | null
          external_presenter_name?: string | null
          id?: string
          month_year?: string
          photo_url?: string | null
          presenter_user_id?: string | null
          scheduled_date?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      desvio_comments: {
        Row: {
          content: string
          created_at: string
          desvio_id: string
          environment: string
          id: string
          user_avatar_url: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          desvio_id: string
          environment?: string
          id?: string
          user_avatar_url?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          desvio_id?: string
          environment?: string
          id?: string
          user_avatar_url?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "desvio_comments_desvio_id_fkey"
            columns: ["desvio_id"]
            isOneToOne: false
            referencedRelation: "desvios"
            referencedColumns: ["id"]
          },
        ]
      }
      desvios: {
        Row: {
          attachments: Json | null
          client_op_id: string | null
          comments: string | null
          correction: string | null
          correction_photo_urls: string[] | null
          created_at: string
          created_by: string
          created_by_name: string
          description: string
          due_date: string | null
          environment: string
          history: Json | null
          id: string
          instruction: string | null
          items: Json | null
          mentioned_user_id: string | null
          mentioned_user_ids: string[] | null
          mentioned_user_name: string | null
          mentioned_user_names: string[] | null
          photo_urls: string[] | null
          priority: string | null
          responsible_company: string | null
          responsible_name: string | null
          responsible_sector: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          client_op_id?: string | null
          comments?: string | null
          correction?: string | null
          correction_photo_urls?: string[] | null
          created_at?: string
          created_by: string
          created_by_name: string
          description: string
          due_date?: string | null
          environment?: string
          history?: Json | null
          id?: string
          instruction?: string | null
          items?: Json | null
          mentioned_user_id?: string | null
          mentioned_user_ids?: string[] | null
          mentioned_user_name?: string | null
          mentioned_user_names?: string[] | null
          photo_urls?: string[] | null
          priority?: string | null
          responsible_company?: string | null
          responsible_name?: string | null
          responsible_sector?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          client_op_id?: string | null
          comments?: string | null
          correction?: string | null
          correction_photo_urls?: string[] | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string
          due_date?: string | null
          environment?: string
          history?: Json | null
          id?: string
          instruction?: string | null
          items?: Json | null
          mentioned_user_id?: string | null
          mentioned_user_ids?: string[] | null
          mentioned_user_name?: string | null
          mentioned_user_names?: string[] | null
          photo_urls?: string[] | null
          priority?: string | null
          responsible_company?: string | null
          responsible_name?: string | null
          responsible_sector?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      document_history: {
        Row: {
          change_type: string
          changed_by: string
          changed_by_name: string
          created_at: string
          document_id: string
          environment: string
          id: string
          new_status: Database["public"]["Enums"]["document_status"] | null
          notes: string | null
          previous_status: Database["public"]["Enums"]["document_status"] | null
        }
        Insert: {
          change_type?: string
          changed_by: string
          changed_by_name: string
          created_at?: string
          document_id: string
          environment?: string
          id?: string
          new_status?: Database["public"]["Enums"]["document_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
        }
        Update: {
          change_type?: string
          changed_by?: string
          changed_by_name?: string
          created_at?: string
          document_id?: string
          environment?: string
          id?: string
          new_status?: Database["public"]["Enums"]["document_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "document_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          environment: string
          expiry_date: string
          file_url: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          environment?: string
          expiry_date: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          environment?: string
          expiry_date?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      domino_games: {
        Row: {
          created_at: string
          environment: string
          game_state: Json
          id: string
          max_players: number
          player1_id: string
          player1_name: string
          player2_id: string | null
          player2_name: string | null
          player3_id: string | null
          player3_name: string | null
          player4_id: string | null
          player4_name: string | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          game_state?: Json
          id?: string
          max_players?: number
          player1_id: string
          player1_name: string
          player2_id?: string | null
          player2_name?: string | null
          player3_id?: string | null
          player3_name?: string | null
          player4_id?: string | null
          player4_name?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          game_state?: Json
          id?: string
          max_players?: number
          player1_id?: string
          player1_name?: string
          player2_id?: string | null
          player2_name?: string | null
          player3_id?: string | null
          player3_name?: string | null
          player4_id?: string | null
          player4_name?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      domino_stats: {
        Row: {
          created_at: string
          environment: string
          id: string
          losses: number
          updated_at: string
          user_id: string
          user_name: string
          wins: number
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          losses?: number
          updated_at?: string
          user_id: string
          user_name: string
          wins?: number
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          losses?: number
          updated_at?: string
          user_id?: string
          user_name?: string
          wins?: number
        }
        Relationships: []
      }
      double_balances: {
        Row: {
          balance: number
          created_at: string
          environment: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      double_bets: {
        Row: {
          avatar_url: string | null
          bet_amount: number
          bet_color: string
          created_at: string
          environment: string
          id: string
          payout: number | null
          round_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          avatar_url?: string | null
          bet_amount: number
          bet_color: string
          created_at?: string
          environment?: string
          id?: string
          payout?: number | null
          round_id: string
          user_id: string
          user_name: string
        }
        Update: {
          avatar_url?: string | null
          bet_amount?: number
          bet_color?: string
          created_at?: string
          environment?: string
          id?: string
          payout?: number | null
          round_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "double_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "double_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      double_rounds: {
        Row: {
          crash_point: number | null
          created_at: string
          environment: string
          finished_at: string | null
          id: string
          result_color: string
          result_number: number
          started_at: string | null
          status: string
        }
        Insert: {
          crash_point?: number | null
          created_at?: string
          environment?: string
          finished_at?: string | null
          id?: string
          result_color: string
          result_number: number
          started_at?: string | null
          status?: string
        }
        Update: {
          crash_point?: number | null
          created_at?: string
          environment?: string
          finished_at?: string | null
          id?: string
          result_color?: string
          result_number?: number
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      driver_action_queue: {
        Row: {
          action: string
          client_action_id: string
          created_at: string
          driver_id: string | null
          equipment_id: string | null
          error: string | null
          id: string
          is_online: boolean | null
          payload: Json | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          client_action_id: string
          created_at?: string
          driver_id?: string | null
          equipment_id?: string | null
          error?: string | null
          id?: string
          is_online?: boolean | null
          payload?: Json | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          client_action_id?: string
          created_at?: string
          driver_id?: string | null
          equipment_id?: string | null
          error?: string | null
          id?: string
          is_online?: boolean | null
          payload?: Json | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      driver_error_log: {
        Row: {
          action: string
          context: Json | null
          created_at: string
          driver_name: string | null
          equipment_id: string | null
          equipment_name: string | null
          error_code: string | null
          error_message: string | null
          id: string
          is_online: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          context?: Json | null
          created_at?: string
          driver_name?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_online?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: Json | null
          created_at?: string
          driver_name?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_online?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      driver_login_audit: {
        Row: {
          created_at: string
          duration_ms: number | null
          email: string | null
          error_code: string | null
          error_message: string | null
          id: string
          is_online: boolean | null
          screen: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          email?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_online?: boolean | null
          screen?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          email?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_online?: boolean | null
          screen?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      driver_vehicle_checklists: {
        Row: {
          client_op_id: string | null
          created_at: string
          created_by: string | null
          driver_name: string | null
          environment: string
          equipment_id: string
          equipment_name: string
          id: string
          plate: string
          problem_description: string
        }
        Insert: {
          client_op_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          environment?: string
          equipment_id: string
          equipment_name: string
          id?: string
          plate: string
          problem_description: string
        }
        Update: {
          client_op_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          environment?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          plate?: string
          problem_description?: string
        }
        Relationships: []
      }
      employee_nrs: {
        Row: {
          completion_date: string | null
          created_at: string
          employee_id: string
          environment: string
          expiry_date: string | null
          id: string
          nr_name: string
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          employee_id: string
          environment?: string
          expiry_date?: string | null
          id?: string
          nr_name: string
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          employee_id?: string
          environment?: string
          expiry_date?: string | null
          id?: string
          nr_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_nrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          area: string | null
          avatar: string
          company: string | null
          created_at: string
          department: string
          email: string | null
          environment: string
          exam_scheduled: string | null
          id: string
          name: string
          nrs: string[] | null
          phone: string | null
          role: string
          start_date: string
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          vacation_due_date: string | null
        }
        Insert: {
          area?: string | null
          avatar: string
          company?: string | null
          created_at?: string
          department: string
          email?: string | null
          environment?: string
          exam_scheduled?: string | null
          id?: string
          name: string
          nrs?: string[] | null
          phone?: string | null
          role: string
          start_date?: string
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          vacation_due_date?: string | null
        }
        Update: {
          area?: string | null
          avatar?: string
          company?: string | null
          created_at?: string
          department?: string
          email?: string | null
          environment?: string
          exam_scheduled?: string | null
          id?: string
          name?: string
          nrs?: string[] | null
          phone?: string | null
          role?: string
          start_date?: string
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          vacation_due_date?: string | null
        }
        Relationships: []
      }
      environments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      epi_exchanges: {
        Row: {
          assinatura_autorizador: string | null
          assinatura_funcionario: string | null
          autorizado_por: string
          created_at: string
          created_by: string
          data: string
          environment: string
          epis: Json
          funcionario_funcao: string | null
          funcionario_matricula: string | null
          funcionario_nome: string
          id: string
          matricula_autorizador: string | null
          motivo_troca: string
          photo_urls: string[]
          uniforme_blusa_quantidade: number | null
          uniforme_blusa_tamanho: string | null
          uniforme_calca_quantidade: number | null
          uniforme_calca_tamanho: string | null
          updated_at: string
        }
        Insert: {
          assinatura_autorizador?: string | null
          assinatura_funcionario?: string | null
          autorizado_por: string
          created_at?: string
          created_by: string
          data?: string
          environment?: string
          epis?: Json
          funcionario_funcao?: string | null
          funcionario_matricula?: string | null
          funcionario_nome: string
          id?: string
          matricula_autorizador?: string | null
          motivo_troca: string
          photo_urls?: string[]
          uniforme_blusa_quantidade?: number | null
          uniforme_blusa_tamanho?: string | null
          uniforme_calca_quantidade?: number | null
          uniforme_calca_tamanho?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_autorizador?: string | null
          assinatura_funcionario?: string | null
          autorizado_por?: string
          created_at?: string
          created_by?: string
          data?: string
          environment?: string
          epis?: Json
          funcionario_funcao?: string | null
          funcionario_matricula?: string | null
          funcionario_nome?: string
          id?: string
          matricula_autorizador?: string | null
          motivo_troca?: string
          photo_urls?: string[]
          uniforme_blusa_quantidade?: number | null
          uniforme_blusa_tamanho?: string | null
          uniforme_calca_quantidade?: number | null
          uniforme_calca_tamanho?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string
          driver: string
          end_hour: number
          environment: string
          equipment_type: string
          helper: string
          id: string
          image_url: string | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          mobilization_status: string
          name: string
          plate: string
          start_hour: number
          stop_reason: string | null
          stop_start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver: string
          end_hour?: number
          environment?: string
          equipment_type?: string
          helper: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          mobilization_status?: string
          name: string
          plate: string
          start_hour?: number
          stop_reason?: string | null
          stop_start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver?: string
          end_hour?: number
          environment?: string
          equipment_type?: string
          helper?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          mobilization_status?: string
          name?: string
          plate?: string
          start_hour?: number
          stop_reason?: string | null
          stop_start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_maintenance_plan: {
        Row: {
          base_horimeter: number
          created_at: string
          environment: string
          equipment_id: string
          equipment_name: string
          id: string
          last_maintenance_date: string | null
          last_maintenance_horimeter: number | null
          plate: string
          target_hours: number
          updated_at: string
        }
        Insert: {
          base_horimeter?: number
          created_at?: string
          environment?: string
          equipment_id: string
          equipment_name: string
          id?: string
          last_maintenance_date?: string | null
          last_maintenance_horimeter?: number | null
          plate: string
          target_hours?: number
          updated_at?: string
        }
        Update: {
          base_horimeter?: number
          created_at?: string
          environment?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          last_maintenance_date?: string | null
          last_maintenance_horimeter?: number | null
          plate?: string
          target_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_plan_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: true
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_movements: {
        Row: {
          client_op_id: string | null
          created_at: string
          created_by: string
          environment: string
          equipment_name: string
          exit_reason:
            | Database["public"]["Enums"]["equipment_exit_reason"]
            | null
          id: string
          movement_date: string
          movement_time: string
          movement_type: Database["public"]["Enums"]["equipment_movement_type"]
          observation: string | null
          plate: string
          problem_description: string | null
          updated_at: string
        }
        Insert: {
          client_op_id?: string | null
          created_at?: string
          created_by: string
          environment?: string
          equipment_name: string
          exit_reason?:
            | Database["public"]["Enums"]["equipment_exit_reason"]
            | null
          id?: string
          movement_date?: string
          movement_time?: string
          movement_type: Database["public"]["Enums"]["equipment_movement_type"]
          observation?: string | null
          plate: string
          problem_description?: string | null
          updated_at?: string
        }
        Update: {
          client_op_id?: string | null
          created_at?: string
          created_by?: string
          environment?: string
          equipment_name?: string
          exit_reason?:
            | Database["public"]["Enums"]["equipment_exit_reason"]
            | null
          id?: string
          movement_date?: string
          movement_time?: string
          movement_type?: Database["public"]["Enums"]["equipment_movement_type"]
          observation?: string | null
          plate?: string
          problem_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_stop_history: {
        Row: {
          changed_by_driver: string | null
          client_op_id: string | null
          created_at: string
          defect_description: string | null
          duration_minutes: number | null
          ended_at: string | null
          environment: string
          equipment_id: string
          id: string
          started_at: string
          stop_reason: string
        }
        Insert: {
          changed_by_driver?: string | null
          client_op_id?: string | null
          created_at?: string
          defect_description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          environment?: string
          equipment_id: string
          id?: string
          started_at: string
          stop_reason: string
        }
        Update: {
          changed_by_driver?: string | null
          client_op_id?: string | null
          created_at?: string
          defect_description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          environment?: string
          equipment_id?: string
          id?: string
          started_at?: string
          stop_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_stop_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          avatar_url: string | null
          best_streak: number
          correct_answers: number
          created_at: string
          environment: string
          game_id: string
          id: string
          played_at: string
          score: number
          total_questions: number
          user_id: string
          user_name: string
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          correct_answers?: number
          created_at?: string
          environment?: string
          game_id: string
          id?: string
          played_at?: string
          score?: number
          total_questions?: number
          user_id: string
          user_name: string
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          correct_answers?: number
          created_at?: string
          environment?: string
          game_id?: string
          id?: string
          played_at?: string
          score?: number
          total_questions?: number
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      google_drive_oauth: {
        Row: {
          access_token: string | null
          account_email: string | null
          connected_at: string
          connected_by: string | null
          id: string
          refresh_token: string
          scope: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          connected_at?: string
          connected_by?: string | null
          id?: string
          refresh_token: string
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          connected_at?: string
          connected_by?: string | null
          id?: string
          refresh_token?: string
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instacena_comments: {
        Row: {
          content: string
          created_at: string
          external_id: string | null
          external_source: string | null
          id: string
          origin: string
          post_id: string
          user_avatar_url: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          origin?: string
          post_id: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          origin?: string
          post_id?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "instacena_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "instacena_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instacena_posts: {
        Row: {
          content: string | null
          created_at: string
          environment: string | null
          external_id: string | null
          external_source: string | null
          id: string
          image_urls: string[] | null
          is_system_post: boolean
          origin: string
          updated_at: string
          user_avatar_url: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          environment?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          image_urls?: string[] | null
          is_system_post?: boolean
          origin?: string
          updated_at?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          content?: string | null
          created_at?: string
          environment?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          image_urls?: string[] | null
          is_system_post?: boolean
          origin?: string
          updated_at?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      instacena_reactions: {
        Row: {
          created_at: string
          external_id: string | null
          external_source: string | null
          id: string
          origin: string
          post_id: string
          reaction_type: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          origin?: string
          post_id: string
          reaction_type?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          origin?: string
          post_id?: string
          reaction_type?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "instacena_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "instacena_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instacena_stories: {
        Row: {
          caption: string | null
          created_at: string
          environment: string | null
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_avatar: string | null
          user_id: string
          user_name: string
          video_duration_ms: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          environment?: string | null
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_avatar?: string | null
          user_id: string
          user_name: string
          video_duration_ms?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          environment?: string | null
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
          video_duration_ms?: number | null
        }
        Relationships: []
      }
      instacena_story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_avatar: string | null
          viewer_id: string
          viewer_name: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_avatar?: string | null
          viewer_id: string
          viewer_name: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_avatar?: string | null
          viewer_id?: string
          viewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "instacena_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "instacena_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          ca_expiry: string | null
          ca_number: string | null
          category: string
          created_at: string
          created_by: string
          environment: string
          id: string
          location_id: string | null
          min_quantity: number
          name: string
          notes: string | null
          photo_urls: string[] | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          ca_expiry?: string | null
          ca_number?: string | null
          category?: string
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          location_id?: string | null
          min_quantity?: number
          name: string
          notes?: string | null
          photo_urls?: string[] | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          ca_expiry?: string | null
          ca_number?: string | null
          category?: string
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          location_id?: string | null
          min_quantity?: number
          name?: string
          notes?: string | null
          photo_urls?: string[] | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          destination_id: string | null
          destination_name: string | null
          destination_type: string | null
          environment: string
          id: string
          item_id: string
          moved_by: string
          moved_by_name: string
          movement_type: string
          new_quantity: number
          previous_quantity: number
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          destination_name?: string | null
          destination_type?: string | null
          environment?: string
          id?: string
          item_id: string
          moved_by: string
          moved_by_name: string
          movement_type: string
          new_quantity: number
          previous_quantity: number
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          destination_name?: string | null
          destination_type?: string | null
          environment?: string
          id?: string
          item_id?: string
          moved_by?: string
          moved_by_name?: string
          movement_type?: string
          new_quantity?: number
          previous_quantity?: number
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      irrigacao_itens: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          id: string
          nome: string
          observacao: string | null
          quantidade: number
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment: string
          id?: string
          nome: string
          observacao?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          nome?: string
          observacao?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      irrigacao_movimentos: {
        Row: {
          created_at: string
          environment: string
          id: string
          item_id: string
          motivo: string | null
          quantidade: number
          registrado_por_id: string | null
          registrado_por_nome: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          item_id: string
          motivo?: string | null
          quantidade: number
          registrado_por_id?: string | null
          registrado_por_nome?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          item_id?: string
          motivo?: string | null
          quantidade?: number
          registrado_por_id?: string | null
          registrado_por_nome?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "irrigacao_movimentos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "irrigacao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      jardinagem_equipment: {
        Row: {
          created_at: string
          environment: string
          id: string
          image_url: string | null
          name: string
          status: string
          status_changed_at: string
          status_changed_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          image_url?: string | null
          name: string
          status?: string
          status_changed_at?: string
          status_changed_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          image_url?: string | null
          name?: string
          status?: string
          status_changed_at?: string
          status_changed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      material_requisitions: {
        Row: {
          area_destino: string
          assinatura_autorizador: string | null
          assinatura_funcionario: string | null
          autorizado_por: string
          client_op_id: string | null
          created_at: string
          created_by: string
          data: string
          environment: string
          funcionario_funcao: string | null
          funcionario_matricula: string | null
          funcionario_nome: string
          id: string
          materiais: Json
          matricula_autorizador: string | null
          motivo: string
          photo_urls: string[]
          updated_at: string
        }
        Insert: {
          area_destino: string
          assinatura_autorizador?: string | null
          assinatura_funcionario?: string | null
          autorizado_por: string
          client_op_id?: string | null
          created_at?: string
          created_by: string
          data?: string
          environment?: string
          funcionario_funcao?: string | null
          funcionario_matricula?: string | null
          funcionario_nome: string
          id?: string
          materiais?: Json
          matricula_autorizador?: string | null
          motivo: string
          photo_urls?: string[]
          updated_at?: string
        }
        Update: {
          area_destino?: string
          assinatura_autorizador?: string | null
          assinatura_funcionario?: string | null
          autorizado_por?: string
          client_op_id?: string | null
          created_at?: string
          created_by?: string
          data?: string
          environment?: string
          funcionario_funcao?: string | null
          funcionario_matricula?: string | null
          funcionario_nome?: string
          id?: string
          materiais?: Json
          matricula_autorizador?: string | null
          motivo?: string
          photo_urls?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      matrix_custom_tasks: {
        Row: {
          cargo_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      matrix_hidden_tasks: {
        Row: {
          created_at: string
          hidden_by: string | null
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          hidden_by?: string | null
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          hidden_by?: string | null
          id?: string
          task_id?: string
        }
        Relationships: []
      }
      matrix_task_completions: {
        Row: {
          completed_at: string
          created_at: string
          environment: string
          id: string
          month_year: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          environment?: string
          id?: string
          month_year: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          environment?: string
          id?: string
          month_year?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_minute_items: {
        Row: {
          action_by: string | null
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deadline: string | null
          dedupe_key: string | null
          description: string
          environment: string
          id: string
          item_number: string
          minute_id: string
          original_status: string | null
          section: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          action_by?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deadline?: string | null
          dedupe_key?: string | null
          description: string
          environment?: string
          id?: string
          item_number: string
          minute_id: string
          original_status?: string | null
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          action_by?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deadline?: string | null
          dedupe_key?: string | null
          description?: string
          environment?: string
          id?: string
          item_number?: string
          minute_id?: string
          original_status?: string | null
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minute_items_minute_id_fkey"
            columns: ["minute_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          file_url: string | null
          id: string
          meeting_date: string | null
          raw_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment?: string
          file_url?: string | null
          id?: string
          meeting_date?: string | null
          raw_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          file_url?: string | null
          id?: string
          meeting_date?: string | null
          raw_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_transcripts: {
        Row: {
          action_items: Json | null
          created_at: string
          created_by: string
          created_by_name: string
          ended_at: string | null
          environment: string
          id: string
          key_points: Json | null
          meeting_id: string | null
          meeting_title: string | null
          participants: string[]
          room_name: string
          snapshots: string[]
          started_at: string
          summary: string | null
          transcript: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string
          created_by: string
          created_by_name: string
          ended_at?: string | null
          environment?: string
          id?: string
          key_points?: Json | null
          meeting_id?: string | null
          meeting_title?: string | null
          participants?: string[]
          room_name: string
          snapshots?: string[]
          started_at?: string
          summary?: string | null
          transcript?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          ended_at?: string | null
          environment?: string
          id?: string
          key_points?: Json | null
          meeting_id?: string | null
          meeting_title?: string | null
          participants?: string[]
          room_name?: string
          snapshots?: string[]
          started_at?: string
          summary?: string | null
          transcript?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string
          description: string | null
          end_time: string | null
          ended_at: string | null
          environment: string
          id: string
          participants: string[]
          room_name: string
          scheduled_date: string
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name: string
          description?: string | null
          end_time?: string | null
          ended_at?: string | null
          environment?: string
          id?: string
          participants?: string[]
          room_name: string
          scheduled_date: string
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string | null
          end_time?: string | null
          ended_at?: string | null
          environment?: string
          id?: string
          participants?: string[]
          room_name?: string
          scheduled_date?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      monthly_game_champions: {
        Row: {
          avatar_url: string | null
          created_at: string
          environment: string
          game_id: string
          game_type: string
          id: string
          month_year: string
          score: number
          user_id: string
          user_name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          environment?: string
          game_id: string
          game_type?: string
          id?: string
          month_year: string
          score?: number
          user_id: string
          user_name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          environment?: string
          game_id?: string
          game_type?: string
          id?: string
          month_year?: string
          score?: number
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      mudas_para_plantar: {
        Row: {
          berma: number | null
          created_at: string
          created_by: string
          environment: string
          especie: string
          faixa: string | null
          id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          berma?: number | null
          created_at?: string
          created_by: string
          environment?: string
          especie: string
          faixa?: string | null
          id?: string
          quantidade: number
          updated_at?: string
        }
        Update: {
          berma?: number | null
          created_at?: string
          created_by?: string
          environment?: string
          especie?: string
          faixa?: string | null
          id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      mudas_plantio: {
        Row: {
          berma: number | null
          created_at: string
          created_by: string
          environment: string
          especie: string
          faixa: string | null
          id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          berma?: number | null
          created_at?: string
          created_by: string
          environment?: string
          especie: string
          faixa?: string | null
          id?: string
          quantidade: number
          updated_at?: string
        }
        Update: {
          berma?: number | null
          created_at?: string
          created_by?: string
          environment?: string
          especie?: string
          faixa?: string | null
          id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          created_at: string
          environment: string
          file_name: string
          file_url: string
          id: string
          time_slot: number
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          file_name: string
          file_url: string
          id?: string
          time_slot?: number
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          file_name?: string
          file_url?: string
          id?: string
          time_slot?: number
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      nav_visibility_rules: {
        Row: {
          cargo: string
          created_at: string
          environment: string
          id: string
          is_hidden: boolean
          nav_item_id: string
          updated_at: string
        }
        Insert: {
          cargo: string
          created_at?: string
          environment?: string
          id?: string
          is_hidden?: boolean
          nav_item_id: string
          updated_at?: string
        }
        Update: {
          cargo?: string
          created_at?: string
          environment?: string
          id?: string
          is_hidden?: boolean
          nav_item_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notas_fiscais: {
        Row: {
          created_at: string
          created_by: string
          data_emissao: string
          descricao: string | null
          environment: string
          file_name: string | null
          file_url: string | null
          fornecedor: string
          id: string
          numero: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          data_emissao?: string
          descricao?: string | null
          environment?: string
          file_name?: string | null
          file_url?: string | null
          fornecedor: string
          id?: string
          numero: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          data_emissao?: string
          descricao?: string | null
          environment?: string
          file_name?: string | null
          file_url?: string | null
          fornecedor?: string
          id?: string
          numero?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          environment: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nr_catalog: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          nr_code: string
          nr_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          nr_code: string
          nr_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          nr_code?: string
          nr_name?: string
        }
        Relationships: []
      }
      nr_records: {
        Row: {
          collaborator_id: string | null
          created_at: string | null
          db_row_id: string | null
          document_url: string | null
          environment: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          nr_id: string | null
          updated_at: string | null
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string | null
          db_row_id?: string | null
          document_url?: string | null
          environment?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          nr_id?: string | null
          updated_at?: string | null
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string | null
          db_row_id?: string | null
          document_url?: string | null
          environment?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          nr_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr_records_db_row_id_fkey"
            columns: ["db_row_id"]
            isOneToOne: false
            referencedRelation: "rh_efetivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr_records_nr_id_fkey"
            columns: ["nr_id"]
            isOneToOne: false
            referencedRelation: "nr_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      nr_trainings: {
        Row: {
          area: string | null
          collaborator_name: string
          created_at: string
          id: string
          matricula: string | null
          role: string | null
          status: string
          training: string
          training_date: string | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          area?: string | null
          collaborator_name: string
          created_at?: string
          id?: string
          matricula?: string | null
          role?: string | null
          status?: string
          training: string
          training_date?: string | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          area?: string | null
          collaborator_name?: string
          created_at?: string
          id?: string
          matricula?: string | null
          role?: string | null
          status?: string
          training?: string
          training_date?: string | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      order_history: {
        Row: {
          change_type: string | null
          changed_by: string
          changed_by_name: string
          created_at: string
          environment: string
          id: string
          new_quantity: number | null
          new_status: Database["public"]["Enums"]["order_status"]
          new_unit: string | null
          notes: string | null
          order_id: string
          previous_quantity: number | null
          previous_status: Database["public"]["Enums"]["order_status"] | null
          previous_unit: string | null
        }
        Insert: {
          change_type?: string | null
          changed_by: string
          changed_by_name: string
          created_at?: string
          environment?: string
          id?: string
          new_quantity?: number | null
          new_status: Database["public"]["Enums"]["order_status"]
          new_unit?: string | null
          notes?: string | null
          order_id: string
          previous_quantity?: number | null
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          previous_unit?: string | null
        }
        Update: {
          change_type?: string | null
          changed_by?: string
          changed_by_name?: string
          created_at?: string
          environment?: string
          id?: string
          new_quantity?: number | null
          new_status?: Database["public"]["Enums"]["order_status"]
          new_unit?: string | null
          notes?: string | null
          order_id?: string
          previous_quantity?: number | null
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          previous_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string | null
          environment: string
          id: string
          order_id: string
          photo_urls: string[] | null
          product_name: string
          quantity: number
          quantity_unit: Database["public"]["Enums"]["quantity_unit"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          order_id: string
          photo_urls?: string[] | null
          product_name: string
          quantity: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          order_id?: string
          photo_urls?: string[] | null
          product_name?: string
          quantity?: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ai_generated_image_url: string | null
          created_at: string
          description: string | null
          environment: string
          expected_date: string | null
          id: string
          mentioned_cargo: string | null
          mentioned_user_id: string | null
          notes: string | null
          order_number: string | null
          photo_urls: string[] | null
          product_name: string
          quantity: number
          quantity_unit: Database["public"]["Enums"]["quantity_unit"]
          requester_id: string
          requester_name: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          ai_generated_image_url?: string | null
          created_at?: string
          description?: string | null
          environment?: string
          expected_date?: string | null
          id?: string
          mentioned_cargo?: string | null
          mentioned_user_id?: string | null
          notes?: string | null
          order_number?: string | null
          photo_urls?: string[] | null
          product_name: string
          quantity: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
          requester_id: string
          requester_name: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          ai_generated_image_url?: string | null
          created_at?: string
          description?: string | null
          environment?: string
          expected_date?: string | null
          id?: string
          mentioned_cargo?: string | null
          mentioned_user_id?: string | null
          notes?: string | null
          order_number?: string | null
          photo_urls?: string[] | null
          product_name?: string
          quantity?: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
          requester_id?: string
          requester_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      overtime_records: {
        Row: {
          cargo: string
          created_at: string
          entry_time: string
          environment: string
          exit_time: string
          id: string
          is_overtime: boolean
          record_date: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          cargo: string
          created_at?: string
          entry_time: string
          environment?: string
          exit_time: string
          id?: string
          is_overtime?: boolean
          record_date: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          cargo?: string
          created_at?: string
          entry_time?: string
          environment?: string
          exit_time?: string
          id?: string
          is_overtime?: boolean
          record_date?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      overtime_summaries: {
        Row: {
          cargo: string
          created_at: string
          environment: string
          id: string
          period_end: string
          period_start: string
          total_hours_worked: number
          total_overtime_hours: number
          total_overtime_records: number
          total_records: number
          user_id: string
          user_name: string
        }
        Insert: {
          cargo: string
          created_at?: string
          environment?: string
          id?: string
          period_end: string
          period_start: string
          total_hours_worked?: number
          total_overtime_hours?: number
          total_overtime_records?: number
          total_records?: number
          user_id: string
          user_name: string
        }
        Update: {
          cargo?: string
          created_at?: string
          environment?: string
          id?: string
          period_end?: string
          period_start?: string
          total_hours_worked?: number
          total_overtime_hours?: number
          total_overtime_records?: number
          total_records?: number
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      page_customizations: {
        Row: {
          color_value: string | null
          created_at: string
          element_key: string
          element_type: string
          environment: string
          id: string
          image_url: string | null
          metadata: Json | null
          page_key: string
          text_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color_value?: string | null
          created_at?: string
          element_key: string
          element_type?: string
          environment?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          page_key: string
          text_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color_value?: string | null
          created_at?: string
          element_key?: string
          element_type?: string
          environment?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          page_key?: string
          text_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      planejamento_metas: {
        Row: {
          atividade: string
          categoria: string | null
          created_at: string
          display_order: number
          environment: string
          id: string
          is_section_header: boolean
          linha: number | null
          meta: number
          realizado: number
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          atividade: string
          categoria?: string | null
          created_at?: string
          display_order?: number
          environment?: string
          id?: string
          is_section_header?: boolean
          linha?: number | null
          meta?: number
          realizado?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          atividade?: string
          categoria?: string | null
          created_at?: string
          display_order?: number
          environment?: string
          id?: string
          is_section_header?: boolean
          linha?: number | null
          meta?: number
          realizado?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      planejamento_metas_history: {
        Row: {
          created_at: string
          date: string
          id: string
          meta_id: string
          realizado: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          meta_id: string
          realizado?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          meta_id?: string
          realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "planejamento_metas_history_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "planejamento_metas"
            referencedColumns: ["id"]
          },
        ]
      }
      pluviometria_records: {
        Row: {
          ano: number
          created_at: string
          created_by: string
          dia: number
          environment: string
          id: string
          mes: number
          mm: number
          setor: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          created_by: string
          dia: number
          environment?: string
          id?: string
          mes: number
          mm?: number
          setor?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string
          dia?: number
          environment?: string
          id?: string
          mes?: number
          mm?: number
          setor?: string
          updated_at?: string
        }
        Relationships: []
      }
      pos_chuva_inspections: {
        Row: {
          atividade: string | null
          avaliacao_1_data: string | null
          avaliacao_1_horario: string | null
          avaliacao_1_sig_encarregado: string | null
          avaliacao_1_sig_tecnico: string | null
          avaliacao_2_data: string | null
          avaliacao_2_horario: string | null
          avaliacao_2_sig_encarregado: string | null
          avaliacao_2_sig_tecnico: string | null
          avaliacao_3_data: string | null
          avaliacao_3_horario: string | null
          avaliacao_3_sig_encarregado: string | null
          avaliacao_3_sig_tecnico: string | null
          checklist: Json
          chuva_fim: string | null
          chuva_inicio: string | null
          created_at: string
          created_by: string
          data: string
          empresa: string | null
          environment: string
          id: string
          local_inspecao: string | null
          observacoes: string | null
          plano_acao: Json
          projeto: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          atividade?: string | null
          avaliacao_1_data?: string | null
          avaliacao_1_horario?: string | null
          avaliacao_1_sig_encarregado?: string | null
          avaliacao_1_sig_tecnico?: string | null
          avaliacao_2_data?: string | null
          avaliacao_2_horario?: string | null
          avaliacao_2_sig_encarregado?: string | null
          avaliacao_2_sig_tecnico?: string | null
          avaliacao_3_data?: string | null
          avaliacao_3_horario?: string | null
          avaliacao_3_sig_encarregado?: string | null
          avaliacao_3_sig_tecnico?: string | null
          checklist?: Json
          chuva_fim?: string | null
          chuva_inicio?: string | null
          created_at?: string
          created_by: string
          data?: string
          empresa?: string | null
          environment?: string
          id?: string
          local_inspecao?: string | null
          observacoes?: string | null
          plano_acao?: Json
          projeto?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          atividade?: string | null
          avaliacao_1_data?: string | null
          avaliacao_1_horario?: string | null
          avaliacao_1_sig_encarregado?: string | null
          avaliacao_1_sig_tecnico?: string | null
          avaliacao_2_data?: string | null
          avaliacao_2_horario?: string | null
          avaliacao_2_sig_encarregado?: string | null
          avaliacao_2_sig_tecnico?: string | null
          avaliacao_3_data?: string | null
          avaliacao_3_horario?: string | null
          avaliacao_3_sig_encarregado?: string | null
          avaliacao_3_sig_tecnico?: string | null
          checklist?: Json
          chuva_fim?: string | null
          chuva_inicio?: string | null
          created_at?: string
          created_by?: string
          data?: string
          empresa?: string | null
          environment?: string
          id?: string
          local_inspecao?: string | null
          observacoes?: string | null
          plano_acao?: Json
          projeto?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      presentations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          slides: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          slides?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          slides?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          environment: string
          generated_at: string | null
          id: string
          image_url: string | null
          product_name: string
          product_ni: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          environment?: string
          generated_at?: string | null
          id?: string
          image_url?: string | null
          product_name: string
          product_ni: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          environment?: string
          generated_at?: string | null
          id?: string
          image_url?: string | null
          product_name?: string
          product_ni?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: Database["public"]["Enums"]["cargo_type"]
          created_at: string
          environment: string | null
          frame_animation: string | null
          frame_color: string | null
          full_name: string
          id: string
          neon_color: string | null
          sidebar_active_color: string | null
          sidebar_active_font_color: string | null
          sidebar_animation: string | null
          sidebar_color: string | null
          sidebar_font: string | null
          sidebar_font_color: string | null
          ui_theme: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          environment?: string | null
          frame_animation?: string | null
          frame_color?: string | null
          full_name: string
          id?: string
          neon_color?: string | null
          sidebar_active_color?: string | null
          sidebar_active_font_color?: string | null
          sidebar_animation?: string | null
          sidebar_color?: string | null
          sidebar_font?: string | null
          sidebar_font_color?: string | null
          ui_theme?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          environment?: string | null
          frame_animation?: string | null
          frame_color?: string | null
          full_name?: string
          id?: string
          neon_color?: string | null
          sidebar_active_color?: string | null
          sidebar_active_font_color?: string | null
          sidebar_animation?: string | null
          sidebar_color?: string | null
          sidebar_font?: string | null
          sidebar_font_color?: string | null
          ui_theme?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      radio_now_playing: {
        Row: {
          id: string
          played_ids: Json
          queue: Json
          shuffle_all: boolean
          started_at: string
          track_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          played_ids?: Json
          queue?: Json
          shuffle_all?: boolean
          started_at?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          played_ids?: Json
          queue?: Json
          shuffle_all?: boolean
          started_at?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rdo_report_locks: {
        Row: {
          created_at: string
          environment: string
          id: string
          locked_at: string
          locked_by: string
          report_date: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          locked_at?: string
          locked_by: string
          report_date: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          locked_at?: string
          locked_by?: string
          report_date?: string
        }
        Relationships: []
      }
      rdo_reports: {
        Row: {
          apparent_temp: number | null
          created_at: string
          created_by: string
          dds_text: string | null
          difficulties: string | null
          efetivo_gabiao_text: string | null
          efetivo_jardinagem_text: string | null
          environment: string
          gabiao_activities: string | null
          gabiao_location: string | null
          humidity: number | null
          id: string
          jardinagem_activities: string | null
          jardinagem_location: string | null
          photo_urls: string[] | null
          planned_activities: Json | null
          planned_gabiao_locked: boolean | null
          planned_jardinagem_locked: boolean | null
          report_date: string
          report_text: string
          temperature: number | null
          temperature_captured_at: string | null
          updated_at: string
          weather_afternoon: string
          weather_morning: string
        }
        Insert: {
          apparent_temp?: number | null
          created_at?: string
          created_by: string
          dds_text?: string | null
          difficulties?: string | null
          efetivo_gabiao_text?: string | null
          efetivo_jardinagem_text?: string | null
          environment?: string
          gabiao_activities?: string | null
          gabiao_location?: string | null
          humidity?: number | null
          id?: string
          jardinagem_activities?: string | null
          jardinagem_location?: string | null
          photo_urls?: string[] | null
          planned_activities?: Json | null
          planned_gabiao_locked?: boolean | null
          planned_jardinagem_locked?: boolean | null
          report_date: string
          report_text: string
          temperature?: number | null
          temperature_captured_at?: string | null
          updated_at?: string
          weather_afternoon?: string
          weather_morning?: string
        }
        Update: {
          apparent_temp?: number | null
          created_at?: string
          created_by?: string
          dds_text?: string | null
          difficulties?: string | null
          efetivo_gabiao_text?: string | null
          efetivo_jardinagem_text?: string | null
          environment?: string
          gabiao_activities?: string | null
          gabiao_location?: string | null
          humidity?: number | null
          id?: string
          jardinagem_activities?: string | null
          jardinagem_location?: string | null
          photo_urls?: string[] | null
          planned_activities?: Json | null
          planned_gabiao_locked?: boolean | null
          planned_jardinagem_locked?: boolean | null
          report_date?: string
          report_text?: string
          temperature?: number | null
          temperature_captured_at?: string | null
          updated_at?: string
          weather_afternoon?: string
          weather_morning?: string
        }
        Relationships: []
      }
      reminder_history: {
        Row: {
          action: string
          action_by: string
          created_at: string
          environment: string
          event_date: string
          id: string
          mention_type: string
          original_created_by: string
          reminder_description: string | null
          reminder_id: string
          reminder_title: string
        }
        Insert: {
          action: string
          action_by: string
          created_at?: string
          environment?: string
          event_date: string
          id?: string
          mention_type: string
          original_created_by: string
          reminder_description?: string | null
          reminder_id: string
          reminder_title: string
        }
        Update: {
          action?: string
          action_by?: string
          created_at?: string
          environment?: string
          event_date?: string
          id?: string
          mention_type?: string
          original_created_by?: string
          reminder_description?: string | null
          reminder_id?: string
          reminder_title?: string
        }
        Relationships: []
      }
      reminder_notifications_sent: {
        Row: {
          channel: string
          id: string
          occurrence_type: string
          recipients_count: number
          reminder_id: string
          scheduled_for_date: string
          sent_at: string
        }
        Insert: {
          channel: string
          id?: string
          occurrence_type: string
          recipients_count?: number
          reminder_id: string
          scheduled_for_date: string
          sent_at?: string
        }
        Update: {
          channel?: string
          id?: string
          occurrence_type?: string
          recipients_count?: number
          reminder_id?: string
          scheduled_for_date?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_notifications_sent_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_snoozes: {
        Row: {
          created_at: string
          environment: string
          id: string
          reminder_id: string
          snoozed_until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          reminder_id: string
          snoozed_until: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          reminder_id?: string
          snoozed_until?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_snoozes_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          acknowledged_by: string[] | null
          alert_days_before: number | null
          created_at: string
          created_by: string
          description: string | null
          environment: string
          event_date: string
          event_time: string | null
          id: string
          is_recurring: boolean | null
          mention_type: string
          mentioned_users: string[] | null
          recurring_days: number[] | null
          show_on_event_day: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_by?: string[] | null
          alert_days_before?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          environment?: string
          event_date: string
          event_time?: string | null
          id?: string
          is_recurring?: boolean | null
          mention_type: string
          mentioned_users?: string[] | null
          recurring_days?: number[] | null
          show_on_event_day?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_by?: string[] | null
          alert_days_before?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          environment?: string
          event_date?: string
          event_time?: string | null
          id?: string
          is_recurring?: boolean | null
          mention_type?: string
          mentioned_users?: string[] | null
          recurring_days?: number[] | null
          show_on_event_day?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      residuos_efluentes: {
        Row: {
          ano: number
          created_at: string
          created_by: string
          environment: string
          id: string
          kg: number
          mes: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          kg?: number
          mes: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          kg?: number
          mes?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      rh_efetivo: {
        Row: {
          colaboradores: Json
          deleted_ids: Json
          environment: string
          id: string
          imported_at: string
          imported_by: string
          updated_at: string
        }
        Insert: {
          colaboradores?: Json
          deleted_ids?: Json
          environment?: string
          id?: string
          imported_at?: string
          imported_by?: string
          updated_at?: string
        }
        Update: {
          colaboradores?: Json
          deleted_ids?: Json
          environment?: string
          id?: string
          imported_at?: string
          imported_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_files: {
        Row: {
          category: string
          created_at: string
          environment: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          category?: string
          created_at?: string
          environment?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          category?: string
          created_at?: string
          environment?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: []
      }
      site_inspection_schedule: {
        Row: {
          created_at: string
          created_by: string
          environment: string
          id: string
          next_inspection_date: string
          next_inspection_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          next_inspection_date: string
          next_inspection_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          next_inspection_date?: string
          next_inspection_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_inspection_tasks: {
        Row: {
          after_photo_url: string | null
          before_photo_url: string | null
          completed_at: string | null
          created_at: string
          description: string
          environment: string
          id: string
          inspection_id: string
          is_completed: boolean
          observation: string | null
        }
        Insert: {
          after_photo_url?: string | null
          before_photo_url?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          environment?: string
          id?: string
          inspection_id: string
          is_completed?: boolean
          observation?: string | null
        }
        Update: {
          after_photo_url?: string | null
          before_photo_url?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          environment?: string
          id?: string
          inspection_id?: string
          is_completed?: boolean
          observation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_inspection_tasks_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "site_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      site_inspections: {
        Row: {
          created_at: string
          created_by: string
          environment: string
          id: string
          inspection_date: string
          is_locked: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          inspection_date?: string
          is_locked?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          inspection_date?: string
          is_locked?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          card_opacity: number
          custom_attendance_area_label: string | null
          environment: string | null
          environment_selection_background_url: string | null
          forbidden_color_title: string | null
          forbidden_colors_by_month: Json | null
          global_background_opacity: number | null
          global_background_url: string | null
          id: string
          instacena_gif_height: number | null
          instacena_gif_opacity: number | null
          instacena_gif_position: Json | null
          instacena_gif_right_height: number | null
          instacena_gif_right_opacity: number | null
          instacena_gif_right_position: Json | null
          instacena_gif_right_size: number | null
          instacena_gif_right_url: string | null
          instacena_gif_size: number | null
          instacena_gif_url: string | null
          login_anim_intensity: number
          login_anim_logo_duration_ms: number
          login_anim_name_duration_ms: number
          login_background_url: string | null
          login_particles_color: string | null
          login_particles_color2: string | null
          login_particles_color3: string | null
          login_particles_count: number | null
          login_particles_enabled: boolean | null
          login_particles_speed: number | null
          login_transition_media_url: string | null
          logo_url: string | null
          nav_order: Json | null
          page_loading_img_url: string | null
          primary_color: string | null
          rh_matricula_hydro_label: string | null
          screensaver_enabled: boolean | null
          screensaver_timeout: number | null
          show_signup_button: boolean
          sidebar_active_color: string | null
          sidebar_active_font_color: string | null
          sidebar_animation: string | null
          sidebar_color: string | null
          sidebar_font: string | null
          sidebar_font_color: string | null
          sync_login_bg_to_sidebar: boolean | null
          transition_logo_url: string | null
          ui_theme: string
          updated_at: string
          updated_by: string | null
          weather_cold_media_url: string | null
          weather_day_cold_media_urls: string[]
          weather_day_rainy_media_urls: string[]
          weather_day_sunny_media_urls: string[]
          weather_night_cold_media_urls: string[]
          weather_night_hot_media_urls: string[]
          weather_night_rainy_media_urls: string[]
          weather_rainy_media_url: string | null
          weather_sunny_media_url: string | null
        }
        Insert: {
          card_opacity?: number
          custom_attendance_area_label?: string | null
          environment?: string | null
          environment_selection_background_url?: string | null
          forbidden_color_title?: string | null
          forbidden_colors_by_month?: Json | null
          global_background_opacity?: number | null
          global_background_url?: string | null
          id?: string
          instacena_gif_height?: number | null
          instacena_gif_opacity?: number | null
          instacena_gif_position?: Json | null
          instacena_gif_right_height?: number | null
          instacena_gif_right_opacity?: number | null
          instacena_gif_right_position?: Json | null
          instacena_gif_right_size?: number | null
          instacena_gif_right_url?: string | null
          instacena_gif_size?: number | null
          instacena_gif_url?: string | null
          login_anim_intensity?: number
          login_anim_logo_duration_ms?: number
          login_anim_name_duration_ms?: number
          login_background_url?: string | null
          login_particles_color?: string | null
          login_particles_color2?: string | null
          login_particles_color3?: string | null
          login_particles_count?: number | null
          login_particles_enabled?: boolean | null
          login_particles_speed?: number | null
          login_transition_media_url?: string | null
          logo_url?: string | null
          nav_order?: Json | null
          page_loading_img_url?: string | null
          primary_color?: string | null
          rh_matricula_hydro_label?: string | null
          screensaver_enabled?: boolean | null
          screensaver_timeout?: number | null
          show_signup_button?: boolean
          sidebar_active_color?: string | null
          sidebar_active_font_color?: string | null
          sidebar_animation?: string | null
          sidebar_color?: string | null
          sidebar_font?: string | null
          sidebar_font_color?: string | null
          sync_login_bg_to_sidebar?: boolean | null
          transition_logo_url?: string | null
          ui_theme?: string
          updated_at?: string
          updated_by?: string | null
          weather_cold_media_url?: string | null
          weather_day_cold_media_urls?: string[]
          weather_day_rainy_media_urls?: string[]
          weather_day_sunny_media_urls?: string[]
          weather_night_cold_media_urls?: string[]
          weather_night_hot_media_urls?: string[]
          weather_night_rainy_media_urls?: string[]
          weather_rainy_media_url?: string | null
          weather_sunny_media_url?: string | null
        }
        Update: {
          card_opacity?: number
          custom_attendance_area_label?: string | null
          environment?: string | null
          environment_selection_background_url?: string | null
          forbidden_color_title?: string | null
          forbidden_colors_by_month?: Json | null
          global_background_opacity?: number | null
          global_background_url?: string | null
          id?: string
          instacena_gif_height?: number | null
          instacena_gif_opacity?: number | null
          instacena_gif_position?: Json | null
          instacena_gif_right_height?: number | null
          instacena_gif_right_opacity?: number | null
          instacena_gif_right_position?: Json | null
          instacena_gif_right_size?: number | null
          instacena_gif_right_url?: string | null
          instacena_gif_size?: number | null
          instacena_gif_url?: string | null
          login_anim_intensity?: number
          login_anim_logo_duration_ms?: number
          login_anim_name_duration_ms?: number
          login_background_url?: string | null
          login_particles_color?: string | null
          login_particles_color2?: string | null
          login_particles_color3?: string | null
          login_particles_count?: number | null
          login_particles_enabled?: boolean | null
          login_particles_speed?: number | null
          login_transition_media_url?: string | null
          logo_url?: string | null
          nav_order?: Json | null
          page_loading_img_url?: string | null
          primary_color?: string | null
          rh_matricula_hydro_label?: string | null
          screensaver_enabled?: boolean | null
          screensaver_timeout?: number | null
          show_signup_button?: boolean
          sidebar_active_color?: string | null
          sidebar_active_font_color?: string | null
          sidebar_animation?: string | null
          sidebar_color?: string | null
          sidebar_font?: string | null
          sidebar_font_color?: string | null
          sync_login_bg_to_sidebar?: boolean | null
          transition_logo_url?: string | null
          ui_theme?: string
          updated_at?: string
          updated_by?: string | null
          weather_cold_media_url?: string | null
          weather_day_cold_media_urls?: string[]
          weather_day_rainy_media_urls?: string[]
          weather_day_sunny_media_urls?: string[]
          weather_night_cold_media_urls?: string[]
          weather_night_hot_media_urls?: string[]
          weather_night_rainy_media_urls?: string[]
          weather_rainy_media_url?: string | null
          weather_sunny_media_url?: string | null
        }
        Relationships: []
      }
      sling_equipment: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string
          environment: string
          id: string
          tag: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by: string
          description: string
          environment?: string
          id?: string
          tag: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          environment?: string
          id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      sling_inspection_audit: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          field: string | null
          id: string
          inspection_id: string
          new_value: string | null
          old_value: string | null
          sling_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          field?: string | null
          id?: string
          inspection_id: string
          new_value?: string | null
          old_value?: string | null
          sling_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          field?: string | null
          id?: string
          inspection_id?: string
          new_value?: string | null
          old_value?: string | null
          sling_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sling_inspection_audit_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "sling_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sling_inspection_audit_sling_id_fkey"
            columns: ["sling_id"]
            isOneToOne: false
            referencedRelation: "sling_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      sling_inspections: {
        Row: {
          created_at: string
          environment: string
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_date: string
          notes: string | null
          photo_url: string | null
          sling_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date: string
          notes?: string | null
          photo_url?: string | null
          sling_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date?: string
          notes?: string | null
          photo_url?: string | null
          sling_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sling_inspections_sling_id_fkey"
            columns: ["sling_id"]
            isOneToOne: false
            referencedRelation: "sling_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          created_at: string
          description: string | null
          environment: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_team_settings: {
        Row: {
          area: string
          enc: string
          enc_geral: string
          id: string
          tst: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area: string
          enc?: string
          enc_geral?: string
          id?: string
          tst?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string
          enc?: string
          enc_geral?: string
          id?: string
          tst?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tigrinho_bets: {
        Row: {
          avatar_url: string | null
          bet_amount: number
          created_at: string
          environment: string
          id: string
          multiplier: number
          payout: number
          result_symbols: string[]
          user_id: string
          user_name: string
        }
        Insert: {
          avatar_url?: string | null
          bet_amount: number
          created_at?: string
          environment?: string
          id?: string
          multiplier?: number
          payout?: number
          result_symbols?: string[]
          user_id: string
          user_name?: string
        }
        Update: {
          avatar_url?: string | null
          bet_amount?: number
          created_at?: string
          environment?: string
          id?: string
          multiplier?: number
          payout?: number
          result_symbols?: string[]
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      user_environment_access: {
        Row: {
          created_at: string
          environment: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_tab_color: string | null
          created_at: string
          dashboard_order: Json | null
          id: string
          nav_order: Json | null
          notification_sound: string | null
          page_background_color: string | null
          session_duration_hours: number
          sidebar_color: string | null
          sidebar_font_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tab_color?: string | null
          created_at?: string
          dashboard_order?: Json | null
          id?: string
          nav_order?: Json | null
          notification_sound?: string | null
          page_background_color?: string | null
          session_duration_hours?: number
          sidebar_color?: string | null
          sidebar_font_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tab_color?: string | null
          created_at?: string
          dashboard_order?: Json | null
          id?: string
          nav_order?: Json | null
          notification_sound?: string | null
          page_background_color?: string | null
          session_duration_hours?: number
          sidebar_color?: string | null
          sidebar_font_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string
          last_seen_at: string
          online_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_seen_at?: string
          online_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_seen_at?: string
          online_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_inspections: {
        Row: {
          created_at: string
          created_by: string
          cronografo: string | null
          documents: Json
          environment: string
          id: string
          laudo_mecanico: string | null
          laudo_opacidade: string | null
          modelo_veiculo: string
          numero_cracha: string
          placa: string
          plano_manutencao: string | null
          updated_at: string
          vistoria: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          cronografo?: string | null
          documents?: Json
          environment?: string
          id?: string
          laudo_mecanico?: string | null
          laudo_opacidade?: string | null
          modelo_veiculo: string
          numero_cracha: string
          placa: string
          plano_manutencao?: string | null
          updated_at?: string
          vistoria?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          cronografo?: string | null
          documents?: Json
          environment?: string
          id?: string
          laudo_mecanico?: string | null
          laudo_opacidade?: string | null
          modelo_veiculo?: string
          numero_cracha?: string
          placa?: string
          plano_manutencao?: string | null
          updated_at?: string
          vistoria?: string | null
        }
        Relationships: []
      }
      wapi_aso_alerts_sent: {
        Row: {
          colaborador_key: string
          expiry_date: string
          id: string
          sent_at: string
        }
        Insert: {
          colaborador_key: string
          expiry_date: string
          id?: string
          sent_at?: string
        }
        Update: {
          colaborador_key?: string
          expiry_date?: string
          id?: string
          sent_at?: string
        }
        Relationships: []
      }
      wapi_broadcasts: {
        Row: {
          caption: string | null
          created_at: string
          environment: string | null
          id: string
          image_url: string | null
          kind: string | null
          message: string | null
          origin: string | null
          target_type: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          environment?: string | null
          id?: string
          image_url?: string | null
          kind?: string | null
          message?: string | null
          origin?: string | null
          target_type?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          environment?: string | null
          id?: string
          image_url?: string | null
          kind?: string | null
          message?: string | null
          origin?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      wapi_config: {
        Row: {
          auto_send_adubo_alert: boolean
          auto_send_aso_alert: boolean
          auto_send_ata_contrato: boolean
          auto_send_attendance: boolean
          auto_send_billing_alert: boolean
          auto_send_campaign_alert: boolean
          auto_send_cronograma_mirante: boolean | null
          auto_send_dds_photo: boolean
          auto_send_desvio_due_alert: boolean
          auto_send_desvios: boolean
          auto_send_driver_app_reminder: boolean
          auto_send_driver_status: boolean
          auto_send_equipment_movements: boolean
          auto_send_forbidden_color_alert: boolean
          auto_send_low_stock_alert: boolean
          auto_send_matrix_alert: boolean
          auto_send_order_alerts: boolean
          auto_send_orders_to_group: boolean
          auto_send_planned_activities: boolean
          auto_send_planning_alerts: boolean
          auto_send_pos_chuva: boolean
          auto_send_reminders: boolean
          auto_send_requisitions: boolean
          auto_send_sling_inspection_alert: boolean
          auto_send_training_alert: boolean | null
          auto_send_vehicle_inspection_alert: boolean
          created_at: string
          dds_auto_notify: boolean
          dds_notify_day_before: boolean
          delay_seconds: number
          enabled: boolean
          group_id: string | null
          group_id_adubo: string | null
          group_id_aso: string | null
          group_id_ata_contrato: string | null
          group_id_attendance: string | null
          group_id_billing: string | null
          group_id_campaign: string | null
          group_id_cronograma_mirante: string | null
          group_id_dds: string | null
          group_id_desvio_due: string | null
          group_id_desvios: string | null
          group_id_driver_app_reminder: string | null
          group_id_driver_status: string | null
          group_id_equipment_movements: string | null
          group_id_forbidden_color: string | null
          group_id_low_stock: string | null
          group_id_matrix: string | null
          group_id_orders: string | null
          group_id_planned_activities: string | null
          group_id_planning: string | null
          group_id_pos_chuva: string | null
          group_id_reminders: string | null
          group_id_requisitions: string | null
          group_id_sling_inspection: string | null
          group_id_training: string | null
          group_id_vehicle_inspection: string | null
          id: string
          instance_id: string
          instance_token: string
          instance_url: string
          last_dispatched_at: string | null
          reroute_private_to_group: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_send_adubo_alert?: boolean
          auto_send_aso_alert?: boolean
          auto_send_ata_contrato?: boolean
          auto_send_attendance?: boolean
          auto_send_billing_alert?: boolean
          auto_send_campaign_alert?: boolean
          auto_send_cronograma_mirante?: boolean | null
          auto_send_dds_photo?: boolean
          auto_send_desvio_due_alert?: boolean
          auto_send_desvios?: boolean
          auto_send_driver_app_reminder?: boolean
          auto_send_driver_status?: boolean
          auto_send_equipment_movements?: boolean
          auto_send_forbidden_color_alert?: boolean
          auto_send_low_stock_alert?: boolean
          auto_send_matrix_alert?: boolean
          auto_send_order_alerts?: boolean
          auto_send_orders_to_group?: boolean
          auto_send_planned_activities?: boolean
          auto_send_planning_alerts?: boolean
          auto_send_pos_chuva?: boolean
          auto_send_reminders?: boolean
          auto_send_requisitions?: boolean
          auto_send_sling_inspection_alert?: boolean
          auto_send_training_alert?: boolean | null
          auto_send_vehicle_inspection_alert?: boolean
          created_at?: string
          dds_auto_notify?: boolean
          dds_notify_day_before?: boolean
          delay_seconds?: number
          enabled?: boolean
          group_id?: string | null
          group_id_adubo?: string | null
          group_id_aso?: string | null
          group_id_ata_contrato?: string | null
          group_id_attendance?: string | null
          group_id_billing?: string | null
          group_id_campaign?: string | null
          group_id_cronograma_mirante?: string | null
          group_id_dds?: string | null
          group_id_desvio_due?: string | null
          group_id_desvios?: string | null
          group_id_driver_app_reminder?: string | null
          group_id_driver_status?: string | null
          group_id_equipment_movements?: string | null
          group_id_forbidden_color?: string | null
          group_id_low_stock?: string | null
          group_id_matrix?: string | null
          group_id_orders?: string | null
          group_id_planned_activities?: string | null
          group_id_planning?: string | null
          group_id_pos_chuva?: string | null
          group_id_reminders?: string | null
          group_id_requisitions?: string | null
          group_id_sling_inspection?: string | null
          group_id_training?: string | null
          group_id_vehicle_inspection?: string | null
          id?: string
          instance_id?: string
          instance_token?: string
          instance_url?: string
          last_dispatched_at?: string | null
          reroute_private_to_group?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_send_adubo_alert?: boolean
          auto_send_aso_alert?: boolean
          auto_send_ata_contrato?: boolean
          auto_send_attendance?: boolean
          auto_send_billing_alert?: boolean
          auto_send_campaign_alert?: boolean
          auto_send_cronograma_mirante?: boolean | null
          auto_send_dds_photo?: boolean
          auto_send_desvio_due_alert?: boolean
          auto_send_desvios?: boolean
          auto_send_driver_app_reminder?: boolean
          auto_send_driver_status?: boolean
          auto_send_equipment_movements?: boolean
          auto_send_forbidden_color_alert?: boolean
          auto_send_low_stock_alert?: boolean
          auto_send_matrix_alert?: boolean
          auto_send_order_alerts?: boolean
          auto_send_orders_to_group?: boolean
          auto_send_planned_activities?: boolean
          auto_send_planning_alerts?: boolean
          auto_send_pos_chuva?: boolean
          auto_send_reminders?: boolean
          auto_send_requisitions?: boolean
          auto_send_sling_inspection_alert?: boolean
          auto_send_training_alert?: boolean | null
          auto_send_vehicle_inspection_alert?: boolean
          created_at?: string
          dds_auto_notify?: boolean
          dds_notify_day_before?: boolean
          delay_seconds?: number
          enabled?: boolean
          group_id?: string | null
          group_id_adubo?: string | null
          group_id_aso?: string | null
          group_id_ata_contrato?: string | null
          group_id_attendance?: string | null
          group_id_billing?: string | null
          group_id_campaign?: string | null
          group_id_cronograma_mirante?: string | null
          group_id_dds?: string | null
          group_id_desvio_due?: string | null
          group_id_desvios?: string | null
          group_id_driver_app_reminder?: string | null
          group_id_driver_status?: string | null
          group_id_equipment_movements?: string | null
          group_id_forbidden_color?: string | null
          group_id_low_stock?: string | null
          group_id_matrix?: string | null
          group_id_orders?: string | null
          group_id_planned_activities?: string | null
          group_id_planning?: string | null
          group_id_pos_chuva?: string | null
          group_id_reminders?: string | null
          group_id_requisitions?: string | null
          group_id_sling_inspection?: string | null
          group_id_training?: string | null
          group_id_vehicle_inspection?: string | null
          id?: string
          instance_id?: string
          instance_token?: string
          instance_url?: string
          last_dispatched_at?: string | null
          reroute_private_to_group?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      wapi_cronograma_mirante_alerts_sent: {
        Row: {
          alert_key: string
          alert_type: string
          atividade_key: string
          id: string
          scheduled_date: string
          sent_at: string
        }
        Insert: {
          alert_key: string
          alert_type: string
          atividade_key: string
          id?: string
          scheduled_date: string
          sent_at?: string
        }
        Update: {
          alert_key?: string
          alert_type?: string
          atividade_key?: string
          id?: string
          scheduled_date?: string
          sent_at?: string
        }
        Relationships: []
      }
      wapi_desvio_due_alerts_sent: {
        Row: {
          alert_type: string
          desvio_key: string
          due_date: string
          id: string
          sent_at: string
        }
        Insert: {
          alert_type: string
          desvio_key: string
          due_date: string
          id?: string
          sent_at?: string
        }
        Update: {
          alert_type?: string
          desvio_key?: string
          due_date?: string
          id?: string
          sent_at?: string
        }
        Relationships: []
      }
      wapi_message_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string
          recipient_name: string | null
          recipient_phone: string
          recipient_user_id: string | null
          response: Json | null
          sent_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          recipient_name?: string | null
          recipient_phone: string
          recipient_user_id?: string | null
          response?: Json | null
          sent_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          recipient_name?: string | null
          recipient_phone?: string
          recipient_user_id?: string | null
          response?: Json | null
          sent_by?: string | null
          status?: string
        }
        Relationships: []
      }
      wapi_outbox: {
        Row: {
          attempts: number
          caption: string | null
          created_at: string
          dedupe_key: string | null
          environment: string | null
          external_id: string | null
          external_kind: string | null
          id: string
          image_url: string | null
          kind: string
          last_error: string | null
          message: string | null
          origin: string | null
          phone: string
          recipient_name: string | null
          recipient_user_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          target_type: string
          updated_at: string
          wapi_message_id: string | null
        }
        Insert: {
          attempts?: number
          caption?: string | null
          created_at?: string
          dedupe_key?: string | null
          environment?: string | null
          external_id?: string | null
          external_kind?: string | null
          id?: string
          image_url?: string | null
          kind: string
          last_error?: string | null
          message?: string | null
          origin?: string | null
          phone: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target_type: string
          updated_at?: string
          wapi_message_id?: string | null
        }
        Update: {
          attempts?: number
          caption?: string | null
          created_at?: string
          dedupe_key?: string | null
          environment?: string | null
          external_id?: string | null
          external_kind?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          last_error?: string | null
          message?: string | null
          origin?: string | null
          phone?: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target_type?: string
          updated_at?: string
          wapi_message_id?: string | null
        }
        Relationships: []
      }
      wapi_training_alerts_sent: {
        Row: {
          alert_key: string
          alert_type: string | null
          expiry_date: string | null
          id: string
          sent_at: string
          training_id: string | null
        }
        Insert: {
          alert_key: string
          alert_type?: string | null
          expiry_date?: string | null
          id?: string
          sent_at?: string
          training_id?: string | null
        }
        Update: {
          alert_key?: string
          alert_type?: string | null
          expiry_date?: string | null
          id?: string
          sent_at?: string
          training_id?: string | null
        }
        Relationships: []
      }
      wapi_vehicle_alerts_sent: {
        Row: {
          alert_key: string
          expiry_date: string
          field_key: string
          id: string
          placa: string
          sent_at: string
        }
        Insert: {
          alert_key: string
          expiry_date: string
          field_key: string
          id?: string
          placa: string
          sent_at?: string
        }
        Update: {
          alert_key?: string
          expiry_date?: string
          field_key?: string
          id?: string
          placa?: string
          sent_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_page_customizations: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_manage_custom_activities: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_manage_employees: { Args: { _user_id: string }; Returns: boolean }
      can_manage_planning: { Args: { _user_id: string }; Returns: boolean }
      check_unread_chat_messages: { Args: never; Returns: undefined }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      cleanup_old_auth_attempts: { Args: never; Returns: undefined }
      create_environment: {
        Args: { _description?: string; _id: string; _label: string }
        Returns: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          label: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "environments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_environment: { Args: never; Returns: string }
      delete_environment: { Args: { _id: string }; Returns: Json }
      enqueue_driver_status_notification: {
        Args: {
          _driver_name?: string
          _equipment_id: string
          _extra_info?: string
          _new_status: string
          _previous_status?: string
          _water_point?: string
        }
        Returns: undefined
      }
      ensure_cron_job: {
        Args: { _command: string; _name: string; _schedule: string }
        Returns: undefined
      }
      ensure_edge_cron: {
        Args: { _body?: Json; _fn: string; _name: string; _schedule: string }
        Returns: undefined
      }
      fn_cleanup_wapi_broadcasts: { Args: never; Returns: undefined }
      get_environment_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_tables_info: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      has_environment_access: {
        Args: { _environment: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      rpc_admin_full_reset: {
        Args: { p_admin_user_id: string; p_environment?: string }
        Returns: Json
      }
      rpc_claim_equipment: {
        Args: {
          p_driver_name: string
          p_environment?: string
          p_equipment_id: string
          p_helper_name: string
          p_user_id: string
        }
        Returns: Json
      }
      rpc_cleanup_stale_equipment_assignments: {
        Args: never
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator" | "visualizador"
      attendance_status: "present" | "late" | "absent" | "justified"
      cargo_type:
        | "preposto"
        | "encarregado_geral"
        | "encarregado_i"
        | "encarregado_ii"
        | "tecnico_seguranca_i"
        | "tecnico_seguranca_ii"
        | "tecnico_meio_ambiente"
        | "aux_administrativo"
        | "aux_almoxarifado"
        | "planejador"
        | "engenheiro_civil"
        | "engenheiro_planejamento"
        | "tecnico_planejamento"
        | "engenheiro_seguranca"
        | "motorista_pipa"
        | "motorista_munk"
        | "visualizador"
        | "moderador"
      document_status: "pending" | "updated" | "cancelled"
      document_type:
        | "pt"
        | "analise_risco"
        | "aso"
        | "treinamento"
        | "certificado"
        | "licenca"
        | "outro"
      employee_status: "active" | "vacation" | "leave"
      equipment_exit_reason:
        | "manutencao_corretiva"
        | "manutencao_preventiva"
        | "vistoria"
        | "operando"
        | "aguardando_frente_servico"
        | "fim_turno"
      equipment_movement_type: "entrada" | "saida"
      order_status:
        | "solicitado"
        | "aprovado"
        | "a_caminho"
        | "entregue"
        | "cancelado"
        | "pedido_realizado"
        | "em_analise"
        | "comprado"
        | "recusado"
      quantity_unit:
        | "unidade"
        | "centimetros"
        | "metros"
        | "quilos"
        | "litros"
        | "pacotes"
        | "caixas"
        | "pecas"
        | "par"
        | "rolo"
        | "saco"
        | "galao"
        | "balde"
        | "metro_quadrado"
        | "metro_cubico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "moderator", "visualizador"],
      attendance_status: ["present", "late", "absent", "justified"],
      cargo_type: [
        "preposto",
        "encarregado_geral",
        "encarregado_i",
        "encarregado_ii",
        "tecnico_seguranca_i",
        "tecnico_seguranca_ii",
        "tecnico_meio_ambiente",
        "aux_administrativo",
        "aux_almoxarifado",
        "planejador",
        "engenheiro_civil",
        "engenheiro_planejamento",
        "tecnico_planejamento",
        "engenheiro_seguranca",
        "motorista_pipa",
        "motorista_munk",
        "visualizador",
        "moderador",
      ],
      document_status: ["pending", "updated", "cancelled"],
      document_type: [
        "pt",
        "analise_risco",
        "aso",
        "treinamento",
        "certificado",
        "licenca",
        "outro",
      ],
      employee_status: ["active", "vacation", "leave"],
      equipment_exit_reason: [
        "manutencao_corretiva",
        "manutencao_preventiva",
        "vistoria",
        "operando",
        "aguardando_frente_servico",
        "fim_turno",
      ],
      equipment_movement_type: ["entrada", "saida"],
      order_status: [
        "solicitado",
        "aprovado",
        "a_caminho",
        "entregue",
        "cancelado",
        "pedido_realizado",
        "em_analise",
        "comprado",
        "recusado",
      ],
      quantity_unit: [
        "unidade",
        "centimetros",
        "metros",
        "quilos",
        "litros",
        "pacotes",
        "caixas",
        "pecas",
        "par",
        "rolo",
        "saco",
        "galao",
        "balde",
        "metro_quadrado",
        "metro_cubico",
      ],
    },
  },
} as const
