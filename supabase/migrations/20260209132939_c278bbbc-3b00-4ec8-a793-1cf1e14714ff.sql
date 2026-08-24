
-- Add is_system_post column to instacena_posts
ALTER TABLE public.instacena_posts ADD COLUMN is_system_post boolean NOT NULL DEFAULT false;

-- Create the system log trigger function
CREATE OR REPLACE FUNCTION public.create_system_log_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_name text;
  _user_avatar text;
  _message text;
  _table_name text;
  _item_name text;
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
        _message := '📦 Pedido #' || COALESCE(NEW.order_number, '') || ' (' || NEW.product_name || '): ' || OLD.status || ' → ' || NEW.status;
      END IF;

    WHEN 'equipment' THEN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.driver IS DISTINCT FROM NEW.driver AND NEW.driver != '' AND OLD.driver = '' THEN
          _message := '🚜 ' || NEW.name || ' (' || NEW.plate || ') selecionado por: ' || NEW.driver;
        ELSIF OLD.stop_reason IS DISTINCT FROM NEW.stop_reason THEN
          _message := '🚜 ' || NEW.name || ': ' || COALESCE(NULLIF(OLD.stop_reason, 'none'), 'operando') || ' → ' || COALESCE(NULLIF(NEW.stop_reason, 'none'), 'operando');
        END IF;
      ELSIF TG_OP = 'INSERT' THEN
        _message := '🚜 Novo equipamento: ' || NEW.name || ' (' || NEW.plate || ')';
      END IF;

    WHEN 'equipment_movements' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '🔄 Movimentação: ' || NEW.equipment_name || ' (' || NEW.plate || ') - ' || NEW.movement_type;
      END IF;

    WHEN 'employees' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '👤 Novo funcionário: ' || NEW.name || ' - ' || NEW.role;
      ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        _message := '👤 ' || NEW.name || ': ' || OLD.status || ' → ' || NEW.status;
      ELSIF TG_OP = 'DELETE' THEN
        _message := '👤 Funcionário removido: ' || OLD.name;
      END IF;

    WHEN 'documents' THEN
      IF TG_OP = 'INSERT' THEN
        _message := '📄 Novo documento: ' || NEW.title;
      ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        _message := '📄 ' || NEW.title || ': ' || OLD.status || ' → ' || NEW.status;
      END IF;

    WHEN 'inventory_movements' THEN
      IF TG_OP = 'INSERT' THEN
        SELECT name INTO _item_name FROM inventory_items WHERE id = NEW.item_id LIMIT 1;
        _message := '📦 Estoque: ' || COALESCE(_item_name, 'item') || ' - ' || NEW.movement_type || ' (' || NEW.quantity || ')';
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
$$;

-- Create triggers on key tables
CREATE TRIGGER log_orders_activity AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION create_system_log_post('orders');
CREATE TRIGGER log_equipment_activity AFTER INSERT OR UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION create_system_log_post('equipment');
CREATE TRIGGER log_equipment_movements_activity AFTER INSERT ON public.equipment_movements FOR EACH ROW EXECUTE FUNCTION create_system_log_post('equipment_movements');
CREATE TRIGGER log_employees_activity AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION create_system_log_post('employees');
CREATE TRIGGER log_documents_activity AFTER INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION create_system_log_post('documents');
CREATE TRIGGER log_inventory_movements_activity AFTER INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION create_system_log_post('inventory_movements');
CREATE TRIGGER log_dds_schedule_activity AFTER INSERT OR UPDATE ON public.dds_schedule FOR EACH ROW EXECUTE FUNCTION create_system_log_post('dds_schedule');
CREATE TRIGGER log_goals_activity AFTER INSERT OR UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION create_system_log_post('goals');
CREATE TRIGGER log_rdo_reports_activity AFTER INSERT OR UPDATE ON public.rdo_reports FOR EACH ROW EXECUTE FUNCTION create_system_log_post('rdo_reports');
CREATE TRIGGER log_jardinagem_activity AFTER INSERT ON public.daily_jardinagem_reports FOR EACH ROW EXECUTE FUNCTION create_system_log_post('daily_jardinagem_reports');
CREATE TRIGGER log_gabiao_activity AFTER INSERT ON public.daily_gabiao_reports FOR EACH ROW EXECUTE FUNCTION create_system_log_post('daily_gabiao_reports');
