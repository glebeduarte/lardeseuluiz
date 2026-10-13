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
      auditoria_acoes: {
        Row: {
          acao: string
          actor_id: string | null
          alvo: string | null
          created_at: string
          detalhe: Json
          id: string
          justificativa: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          alvo?: string | null
          created_at?: string
          detalhe?: Json
          id?: string
          justificativa?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          alvo?: string | null
          created_at?: string
          detalhe?: Json
          id?: string
          justificativa?: string | null
        }
        Relationships: []
      }
      consulente_observacoes: {
        Row: {
          autor_id: string | null
          consulente_id: string
          conteudo: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          consulente_id: string
          conteudo: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          consulente_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulente_observacoes_consulente_id_fkey"
            columns: ["consulente_id"]
            isOneToOne: false
            referencedRelation: "consulentes"
            referencedColumns: ["id"]
          },
        ]
      }
      consulentes: {
        Row: {
          alta_at: string | null
          alta_by: string | null
          conflito_genero: boolean
          conhece_doutrina: boolean | null
          created_at: string
          data_dialogo: string | null
          data_nascimento: string | null
          dialogador_id: string | null
          dialogo_pendente: boolean
          encaminhamento_maca: boolean
          encaminhamento_maca_categoria: string | null
          encaminhamento_passes: boolean
          encaminhamento_passes_qtd: number | null
          evangelho_no_lar: boolean | null
          frequencia: string
          id: string
          ideacao_criminosa: boolean
          ideias_suicidas: boolean
          indicacao_chakras: boolean
          indicacao_desobsessao: boolean
          indicacao_desobsessao_leve: boolean
          indicacao_harmonizacao: boolean
          indicacao_mediunidade: boolean
          indicacao_saude: boolean
          indicacao_saude_texto: string | null
          motivo_conflitos_familiares: boolean
          motivo_saude_espiritual: boolean
          motivo_saude_espiritual_especificacao: string | null
          motivo_saude_fisica: boolean
          motivo_saude_fisica_diagnostico: boolean | null
          motivo_saude_fisica_diagnostico_obs: string | null
          motivo_saude_fisica_especificacao: string | null
          motivo_saude_fisica_tratamento: boolean | null
          motivo_saude_fisica_tratamento_obs: string | null
          motivo_saude_mental: boolean
          motivo_saude_mental_diagnostico: boolean | null
          motivo_saude_mental_diagnostico_obs: string | null
          motivo_saude_mental_especificacao: string | null
          motivo_saude_mental_tratamento: boolean | null
          motivo_saude_mental_tratamento_obs: string | null
          nome: string
          outras_informacoes: string | null
          pratica_religiosa: boolean
          pratica_religiosa_descricao: string | null
          telefone: string | null
          trabalhador: boolean
          tratamento_distancia: boolean
          uso_alcool: boolean
          uso_cigarro: boolean
          uso_drogas: boolean
          uso_medicacoes: boolean
          uso_medicacoes_especificacao: string | null
        }
        Insert: {
          alta_at?: string | null
          alta_by?: string | null
          conflito_genero?: boolean
          conhece_doutrina?: boolean | null
          created_at?: string
          data_dialogo?: string | null
          data_nascimento?: string | null
          dialogador_id?: string | null
          dialogo_pendente?: boolean
          encaminhamento_maca?: boolean
          encaminhamento_maca_categoria?: string | null
          encaminhamento_passes?: boolean
          encaminhamento_passes_qtd?: number | null
          evangelho_no_lar?: boolean | null
          frequencia?: string
          id?: string
          ideacao_criminosa?: boolean
          ideias_suicidas?: boolean
          indicacao_chakras?: boolean
          indicacao_desobsessao?: boolean
          indicacao_desobsessao_leve?: boolean
          indicacao_harmonizacao?: boolean
          indicacao_mediunidade?: boolean
          indicacao_saude?: boolean
          indicacao_saude_texto?: string | null
          motivo_conflitos_familiares?: boolean
          motivo_saude_espiritual?: boolean
          motivo_saude_espiritual_especificacao?: string | null
          motivo_saude_fisica?: boolean
          motivo_saude_fisica_diagnostico?: boolean | null
          motivo_saude_fisica_diagnostico_obs?: string | null
          motivo_saude_fisica_especificacao?: string | null
          motivo_saude_fisica_tratamento?: boolean | null
          motivo_saude_fisica_tratamento_obs?: string | null
          motivo_saude_mental?: boolean
          motivo_saude_mental_diagnostico?: boolean | null
          motivo_saude_mental_diagnostico_obs?: string | null
          motivo_saude_mental_especificacao?: string | null
          motivo_saude_mental_tratamento?: boolean | null
          motivo_saude_mental_tratamento_obs?: string | null
          nome: string
          outras_informacoes?: string | null
          pratica_religiosa?: boolean
          pratica_religiosa_descricao?: string | null
          telefone?: string | null
          trabalhador?: boolean
          tratamento_distancia?: boolean
          uso_alcool?: boolean
          uso_cigarro?: boolean
          uso_drogas?: boolean
          uso_medicacoes?: boolean
          uso_medicacoes_especificacao?: string | null
        }
        Update: {
          alta_at?: string | null
          alta_by?: string | null
          conflito_genero?: boolean
          conhece_doutrina?: boolean | null
          created_at?: string
          data_dialogo?: string | null
          data_nascimento?: string | null
          dialogador_id?: string | null
          dialogo_pendente?: boolean
          encaminhamento_maca?: boolean
          encaminhamento_maca_categoria?: string | null
          encaminhamento_passes?: boolean
          encaminhamento_passes_qtd?: number | null
          evangelho_no_lar?: boolean | null
          frequencia?: string
          id?: string
          ideacao_criminosa?: boolean
          ideias_suicidas?: boolean
          indicacao_chakras?: boolean
          indicacao_desobsessao?: boolean
          indicacao_desobsessao_leve?: boolean
          indicacao_harmonizacao?: boolean
          indicacao_mediunidade?: boolean
          indicacao_saude?: boolean
          indicacao_saude_texto?: string | null
          motivo_conflitos_familiares?: boolean
          motivo_saude_espiritual?: boolean
          motivo_saude_espiritual_especificacao?: string | null
          motivo_saude_fisica?: boolean
          motivo_saude_fisica_diagnostico?: boolean | null
          motivo_saude_fisica_diagnostico_obs?: string | null
          motivo_saude_fisica_especificacao?: string | null
          motivo_saude_fisica_tratamento?: boolean | null
          motivo_saude_fisica_tratamento_obs?: string | null
          motivo_saude_mental?: boolean
          motivo_saude_mental_diagnostico?: boolean | null
          motivo_saude_mental_diagnostico_obs?: string | null
          motivo_saude_mental_especificacao?: string | null
          motivo_saude_mental_tratamento?: boolean | null
          motivo_saude_mental_tratamento_obs?: string | null
          nome?: string
          outras_informacoes?: string | null
          pratica_religiosa?: boolean
          pratica_religiosa_descricao?: string | null
          telefone?: string | null
          trabalhador?: boolean
          tratamento_distancia?: boolean
          uso_alcool?: boolean
          uso_cigarro?: boolean
          uso_drogas?: boolean
          uso_medicacoes?: boolean
          uso_medicacoes_especificacao?: string | null
        }
        Relationships: []
      }
      designacoes: {
        Row: {
          closed_at: string | null
          closure_reason: string | null
          consulente_id: string
          created_at: string
          dialogador_id: string | null
          id: string
          maca_id: string
          observacoes: string | null
          reactivated_at: string | null
          reactivated_by: string | null
          sessoes_realizadas: number
          sessoes_totais: number
          status: Database["public"]["Enums"]["designacao_status"]
        }
        Insert: {
          closed_at?: string | null
          closure_reason?: string | null
          consulente_id: string
          created_at?: string
          dialogador_id?: string | null
          id?: string
          maca_id: string
          observacoes?: string | null
          reactivated_at?: string | null
          reactivated_by?: string | null
          sessoes_realizadas?: number
          sessoes_totais?: number
          status?: Database["public"]["Enums"]["designacao_status"]
        }
        Update: {
          closed_at?: string | null
          closure_reason?: string | null
          consulente_id?: string
          created_at?: string
          dialogador_id?: string | null
          id?: string
          maca_id?: string
          observacoes?: string | null
          reactivated_at?: string | null
          reactivated_by?: string | null
          sessoes_realizadas?: number
          sessoes_totais?: number
          status?: Database["public"]["Enums"]["designacao_status"]
        }
        Relationships: [
          {
            foreignKeyName: "designacoes_consulente_id_fkey"
            columns: ["consulente_id"]
            isOneToOne: false
            referencedRelation: "consulentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designacoes_maca_id_fkey"
            columns: ["maca_id"]
            isOneToOne: false
            referencedRelation: "macas"
            referencedColumns: ["id"]
          },
        ]
      }
      maca_mediuns: {
        Row: {
          created_at: string
          id: string
          maca_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          maca_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          maca_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maca_mediuns_maca_id_fkey"
            columns: ["maca_id"]
            isOneToOne: false
            referencedRelation: "macas"
            referencedColumns: ["id"]
          },
        ]
      }
      macas: {
        Row: {
          ativa: boolean
          categoria: string
          cor_hex: string
          created_at: string
          dia: Database["public"]["Enums"]["dia_trabalho"]
          finalidade: string | null
          id: string
          lotacao_max: number
          mediuns: string[]
          nome: string
          numero: number
        }
        Insert: {
          ativa?: boolean
          categoria?: string
          cor_hex: string
          created_at?: string
          dia?: Database["public"]["Enums"]["dia_trabalho"]
          finalidade?: string | null
          id?: string
          lotacao_max?: number
          mediuns?: string[]
          nome: string
          numero: number
        }
        Update: {
          ativa?: boolean
          categoria?: string
          cor_hex?: string
          created_at?: string
          dia?: Database["public"]["Enums"]["dia_trabalho"]
          finalidade?: string | null
          id?: string
          lotacao_max?: number
          mediuns?: string[]
          nome?: string
          numero?: number
        }
        Relationships: []
      }
      presencas: {
        Row: {
          admin_editado: boolean
          created_at: string
          created_by: string | null
          designacao_id: string
          id: string
          observacao: string | null
          sessao_id: string
          status: Database["public"]["Enums"]["presenca_status"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          admin_editado?: boolean
          created_at?: string
          created_by?: string | null
          designacao_id: string
          id?: string
          observacao?: string | null
          sessao_id: string
          status: Database["public"]["Enums"]["presenca_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          admin_editado?: boolean
          created_at?: string
          created_by?: string | null
          designacao_id?: string
          id?: string
          observacao?: string | null
          sessao_id?: string
          status?: Database["public"]["Enums"]["presenca_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presencas_designacao_id_fkey"
            columns: ["designacao_id"]
            isOneToOne: false
            referencedRelation: "designacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          como_chamar: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          id: string
          must_change_password: boolean
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          como_chamar?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          id: string
          must_change_password?: boolean
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          como_chamar?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          id?: string
          must_change_password?: boolean
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      sessoes: {
        Row: {
          admin_editado: boolean
          created_at: string
          created_by: string | null
          data: string
          id: string
          tipo: Database["public"]["Enums"]["sessao_tipo"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          admin_editado?: boolean
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          tipo: Database["public"]["Enums"]["sessao_tipo"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          admin_editado?: boolean
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          tipo?: Database["public"]["Enums"]["sessao_tipo"]
          updated_at?: string | null
          updated_by?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: { Args: never; Returns: Json }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_dialogador_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_medium_of_consulente_ativa: {
        Args: { _consulente_id: string; _user_id: string }
        Returns: boolean
      }
      is_medium_of_designacao: {
        Args: { _designacao_id: string; _user_id: string }
        Returns: boolean
      }
      is_medium_of_maca: {
        Args: { _maca_id: string; _user_id: string }
        Returns: boolean
      }
      is_recepcao_or_dialog_or_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "recepcao" | "dialogador" | "admin" | "medium"
      designacao_status: "ativa" | "concluida" | "cancelada"
      dia_trabalho: "terca" | "sabado"
      presenca_status:
        | "presente"
        | "ausente"
        | "emergencia"
        | "falta_justificada"
        | "atendimento_distancia"
      sessao_tipo: "terca" | "sabado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["recepcao", "dialogador", "admin", "medium"],
      designacao_status: ["ativa", "concluida", "cancelada"],
      dia_trabalho: ["terca", "sabado"],
      presenca_status: [
        "presente",
        "ausente",
        "emergencia",
        "falta_justificada",
        "atendimento_distancia",
      ],
      sessao_tipo: ["terca", "sabado"],
    },
  },
} as const
