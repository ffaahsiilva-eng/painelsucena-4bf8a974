
CREATE OR REPLACE FUNCTION public.create_system_log_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _user_name text;
  _user_avatar text;
  _message text;
  _table_name text;
  _item_name text;
  _old_status_label text;
  _new_status_label text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT full_name, avatar_url INTO _user_name, _user_avatar
  FROM profiles WHERE user_id = _user_id LIMIT 1;

  _user_name := COALESCE(_user_name, 'Sistema');
  _table_name := TG_ARGV[0];

  CASE _table_name

    WHEN 'orders' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '📦 Novo pedido criado: ' || NEW.product_name;
      ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        _old_status_label := CASE OLD.status
          WHEN 'solicitado' THEN 'Solicitado'
          WHEN 'em_analise' THEN 'Em Análise'
          WHEN 'aprovado' THEN 'Aprovado'
          WHEN 'comprado' THEN 'Comprado'
          WHEN 'entregue' THEN 'Entregue'
          WHEN 'cancelado' THEN 'Cancelado'
          WHEN 'recusado' THEN 'Recusado'
          ELSE OLD.status
        END;
        _new_status_label := CASE NEW.status
          WHEN 'solicitado' THEN 'Solicitado'
          WHEN 'em_analise' THEN 'Em Análise'
          WHEN 'aprovado' THEN 'Aprovado'
          WHEN 'comprado' THEN 'Comprado'
          WHEN 'entregue' THEN 'Entregue'
          WHEN 'cancelado' THEN 'Cancelado'
          WHEN 'recusado' THEN 'Recusado'
          ELSE NEW.status
        END;
        _message := '📦 Pedido #' || COALESCE(NEW.order_number, '') || ' (' || NEW.product_name || '): ' || _old_status_label || ' → ' || _new_status_label;
      END IF;

    WHEN 'equipment' THEN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.driver IS DISTINCT FROM NEW.driver AND NEW.driver != '' AND OLD.driver = '' THEN
          _message := '🚜 ' || NEW.name || ' (' || NEW.plate || ') selecionado por: ' || NEW.driver;
        ELSIF OLD.stop_reason IS DISTINCT FROM NEW.stop_reason THEN
          _old_status_label := CASE COALESCE(NULLIF(OLD.stop_reason, 'none'), 'operando')
            WHEN 'operando' THEN 'Operando'
            WHEN 'waiting' THEN 'Aguardando'
            WHEN 'maintenance' THEN 'Manutenção Corretiva'
            WHEN 'manutencao_corretiva' THEN 'Manutenção Corretiva'
            WHEN 'manutencao_preventiva' THEN 'Manutenção Preventiva'
            WHEN 'aguardando_frente_servico' THEN 'Aguardando Frente'
            WHEN 'fim_turno' THEN 'Fim de Turno'
            WHEN 'end_of_shift' THEN 'Fim de Turno'
            WHEN 'rain' THEN 'Parado (Chuva)'
            WHEN 'end_of_day' THEN 'Abastecendo'
            WHEN 'vistoria' THEN 'Vistoria'
            ELSE COALESCE(NULLIF(OLD.stop_reason, 'none'), 'Operando')
          END;
          _new_status_label := CASE COALESCE(NULLIF(NEW.stop_reason, 'none'), 'operando')
            WHEN 'operando' THEN 'Operando'
            WHEN 'waiting' THEN 'Aguardando'
            WHEN 'maintenance' THEN 'Manutenção Corretiva'
            WHEN 'manutencao_corretiva' THEN 'Manutenção Corretiva'
            WHEN 'manutencao_preventiva' THEN 'Manutenção Preventiva'
            WHEN 'aguardando_frente_servico' THEN 'Aguardando Frente'
            WHEN 'fim_turno' THEN 'Fim de Turno'
            WHEN 'end_of_shift' THEN 'Fim de Turno'
            WHEN 'rain' THEN 'Parado (Chuva)'
            WHEN 'end_of_day' THEN 'Abastecendo'
            WHEN 'vistoria' THEN 'Vistoria'
            ELSE COALESCE(NULLIF(NEW.stop_reason, 'none'), 'Operando')
          END;
          _message := '🚜 ' || NEW.name || ': ' || _old_status_label || ' → ' || _new_status_label;
        END IF;
      ELSIF TG_OP = 'INSERT' THEN
        _message := '🚜 Novo equipamento: ' || NEW.name || ' (' || NEW.plate || ')';
      END IF;

    WHEN 'equipment_movements' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '🔄 Movimentação: ' || NEW.equipment_name || ' (' || NEW.plate || ') - ' || 
          CASE NEW.movement_type::text
            WHEN 'entry' THEN 'Entrada'
            WHEN 'exit' THEN 'Saída'
            ELSE NEW.movement_type::text
          END;
      END IF;

    WHEN 'employees' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '👤 Novo funcionário: ' || NEW.name || ' - ' || NEW.role;
      ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        _old_status_label := CASE OLD.status::text
          WHEN 'active' THEN 'Ativo'
          WHEN 'inactive' THEN 'Inativo'
          WHEN 'vacation' THEN 'Férias'
          WHEN 'leave' THEN 'Afastado'
          ELSE OLD.status::text
        END;
        _new_status_label := CASE NEW.status::text
          WHEN 'active' THEN 'Ativo'
          WHEN 'inactive' THEN 'Inativo'
          WHEN 'vacation' THEN 'Férias'
          WHEN 'leave' THEN 'Afastado'
          ELSE NEW.status::text
        END;
        _message := '👤 ' || NEW.name || ': ' || _old_status_label || ' → ' || _new_status_label;
      ELSIF TG_OP = 'DELETE' THEN
        _message := '👤 Funcionário removido: ' || OLD.name;
      END IF;

    WHEN 'documents' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '📄 Novo documento: ' || NEW.title;
      ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        _old_status_label := CASE OLD.status::text
          WHEN 'pending' THEN 'Pendente'
          WHEN 'updated' THEN 'Atualizado'
          WHEN 'cancelled' THEN 'Cancelado'
          ELSE OLD.status::text
        END;
        _new_status_label := CASE NEW.status::text
          WHEN 'pending' THEN 'Pendente'
          WHEN 'updated' THEN 'Atualizado'
          WHEN 'cancelled' THEN 'Cancelado'
          ELSE NEW.status::text
        END;
        _message := '📄 ' || NEW.title || ': ' || _old_status_label || ' → ' || _new_status_label;
      END IF;

    WHEN 'inventory_movements' THEN
      IF TG_OP = 'INSERT' THEN
        SELECT name INTO _item_name FROM inventory_items WHERE id = NEW.item_id LIMIT 1;
        _message := '📦 Estoque: ' || COALESCE(_item_name, 'item') || ' - ' || 
          CASE NEW.movement_type
            WHEN 'entry' THEN 'Entrada'
            WHEN 'exit' THEN 'Saída'
            WHEN 'adjustment' THEN 'Ajuste'
            ELSE NEW.movement_type
          END || ' (' || NEW.quantity || ')';
      END IF;

    WHEN 'dds_schedule' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '📋 DDS agendado: ' || NEW.theme || ' (' || NEW.scheduled_date || ')';
      ELSIF TG_OP = 'UPDATE' THEN
        _message := '📋 DDS atualizado: ' || NEW.theme;
      END IF;

    WHEN 'goals' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '🎯 Metas definidas: ' || NEW.month_year;
      ELSIF TG_OP = 'UPDATE' THEN
        _message := '🎯 Metas atualizadas: ' || NEW.month_year;
      END IF;

    WHEN 'rdo_reports' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '📝 Novo RDO: ' || NEW.report_date;
      ELSIF TG_OP = 'UPDATE' THEN
        _message := '📝 RDO atualizado: ' || NEW.report_date;
      END IF;

    WHEN 'daily_jardinagem_reports' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '🌿 Relatório Jardinagem: ' || NEW.local_faixa || ' (' || NEW.report_date || ')';
      END IF;

    WHEN 'daily_gabiao_reports' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '🪨 Relatório Gabião: ' || NEW.local_servico || ' (' || NEW.report_date || ')';
      END IF;

    ELSE
      NULL;
  END CASE;

  IF _message IS NOT NULL THEN
    INSERT INTO instacena_posts (user_id, user_name, user_avatar_url, content, image_urls, is_system_post)
    VALUES (_user_id, _user_name, _user_avatar, _message, '{}', true);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
