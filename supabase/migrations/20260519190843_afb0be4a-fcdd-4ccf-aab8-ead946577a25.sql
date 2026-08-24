DROP TRIGGER IF EXISTS trg_notify_driver_status_change ON public.equipment;
CREATE TRIGGER trg_notify_driver_status_change
AFTER UPDATE OF stop_reason ON public.equipment
FOR EACH ROW
WHEN (OLD.stop_reason IS DISTINCT FROM NEW.stop_reason)
EXECUTE FUNCTION public.notify_driver_status_change();

DROP TRIGGER IF EXISTS trg_notify_driver_refueling_point_insert ON public.equipment_stop_history;
CREATE TRIGGER trg_notify_driver_refueling_point_insert
AFTER INSERT ON public.equipment_stop_history
FOR EACH ROW
EXECUTE FUNCTION public.notify_driver_refueling_point_insert();