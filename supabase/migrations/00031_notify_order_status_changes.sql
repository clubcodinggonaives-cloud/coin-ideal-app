-- Order-status notifications (cahier des charges §15: "commande reçue,
-- paiement enregistré, commande confirmée, commande en préparation,
-- commande prête, commande en livraison, commande livrée ou annulée").
-- Only internal notifications are implemented — email/SMS/WhatsApp channels
-- are explicitly listed in the cahier des charges as "selon les
-- intégrations disponibles" (none confirmed yet), so this migration
-- deliberately stops at `public.notifications`, per Phase 4's instruction
-- not to build unconfirmed external integrations.
--
-- `notifications` (00017) already has RLS (`notifications_select_own`) but
-- NO INSERT policy for anyone — correct by design: only the system should
-- write here. These trigger functions are SECURITY DEFINER specifically to
-- cross that boundary safely (same pattern as update_provider_rating() in
-- 00021), never granted to anon/authenticated directly.

CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.client_id,
    'order_status_change',
    'Commande reçue',
    'Votre commande a été transmise à COIN-IDEAL. Vous serez notifié à chaque étape.',
    '/dashboard/orders'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_created_notify ON public.orders;
CREATE TRIGGER on_order_created_notify
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_created();

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_title := CASE NEW.status
    WHEN 'confirmee' THEN 'Commande confirmée'
    WHEN 'en_preparation' THEN 'Commande en préparation'
    WHEN 'prete' THEN 'Commande prête'
    WHEN 'en_livraison' THEN 'Commande en livraison'
    WHEN 'livree' THEN 'Commande livrée'
    WHEN 'retiree' THEN 'Commande retirée'
    WHEN 'annulee' THEN 'Commande annulée'
    ELSE 'Mise à jour de commande'
  END;

  v_message := CASE NEW.status
    WHEN 'confirmee' THEN 'Votre commande a été confirmée par COIN-IDEAL.'
    WHEN 'en_preparation' THEN 'Votre commande est en cours de préparation.'
    WHEN 'prete' THEN CASE
      WHEN NEW.reception_method = 'pickup' THEN 'Votre commande est prête — vous pouvez venir la retirer.'
      ELSE 'Votre commande est prête et sera bientôt livrée.'
    END
    WHEN 'en_livraison' THEN 'Votre commande est en cours de livraison.'
    WHEN 'livree' THEN 'Votre commande a été livrée. Merci de votre confiance !'
    WHEN 'retiree' THEN 'Votre commande a été retirée. Merci de votre confiance !'
    WHEN 'annulee' THEN COALESCE('Votre commande a été annulée — ' || NEW.cancelled_reason, 'Votre commande a été annulée.')
    ELSE 'Le statut de votre commande a changé.'
  END;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (NEW.client_id, 'order_status_change', v_title, v_message, '/dashboard/orders');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change_notify ON public.orders;
CREATE TRIGGER on_order_status_change_notify
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_order_status_change();

-- "Paiement enregistré" (cahier des charges §15) — fires when a staff
-- member records a confirmed payment via record_payment().
CREATE OR REPLACE FUNCTION public.notify_payment_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT client_id INTO v_client_id FROM public.orders WHERE id = NEW.order_id;
  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_client_id,
    'order_status_change',
    'Paiement enregistré',
    'Votre paiement a bien été enregistré par COIN-IDEAL.',
    '/dashboard/orders'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_recorded_notify ON public.payments;
CREATE TRIGGER on_payment_recorded_notify
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION public.notify_payment_recorded();
