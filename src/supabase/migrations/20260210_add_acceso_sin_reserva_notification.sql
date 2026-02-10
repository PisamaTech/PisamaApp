-- Migración: Agregar tipo ACCESO_SIN_RESERVA a la función create_notification_and_queue
-- Este tipo de notificación siempre envía email además de in-app

CREATE OR REPLACE FUNCTION public.create_notification_and_queue(
    p_usuario_id UUID,
    p_tipo TEXT,
    p_titulo TEXT,
    p_mensaje TEXT,
    p_enlace TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_skip_in_app BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notificacion_id BIGINT;
    v_preferencias RECORD;
    v_enqueues_count INT := 0;
BEGIN
    -- 1. Insertar la notificación principal
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace, metadata)
    VALUES (p_usuario_id, p_tipo, p_titulo, p_mensaje, p_enlace, p_metadata)
    RETURNING id INTO v_notificacion_id;

    IF v_notificacion_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo crear el registro principal de la notificación.';
    END IF;

    -- 2. Obtener las preferencias de notificación
    SELECT * INTO v_preferencias FROM public.preferencias_notificaciones WHERE usuario_id = p_usuario_id;

    IF NOT FOUND THEN
        RAISE WARNING 'No se encontraron preferencias de notificación para el usuario %', p_usuario_id;
    END IF;

    -- 3. Crear entradas en la 'cola_envios'

    -- a. El canal 'in-app' es condicional
    IF p_skip_in_app = FALSE THEN
        INSERT INTO public.cola_envios (notificacion_id, canal)
        VALUES (v_notificacion_id, 'in-app');
        v_enqueues_count := v_enqueues_count + 1;
    END IF;

    -- b. Lógica para canales externos
    CASE p_tipo
        WHEN 'BIENVENIDA_PRIMERA_RESERVA' THEN
            -- Notificación crítica: SIEMPRE enviar email (contiene código de acceso)
            INSERT INTO public.cola_envios (notificacion_id, canal)
            VALUES (v_notificacion_id, 'email');
            v_enqueues_count := v_enqueues_count + 1;

        WHEN 'ACCESO_SIN_RESERVA' THEN
            -- Notificación de infracción: SIEMPRE enviar email
            INSERT INTO public.cola_envios (notificacion_id, canal)
            VALUES (v_notificacion_id, 'email');
            v_enqueues_count := v_enqueues_count + 1;

        WHEN 'FACTURA_NUEVA' THEN
            IF v_preferencias.factura_nueva_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.factura_nueva_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'FACTURA_PAGADA' THEN
            IF v_preferencias.factura_pagada_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.factura_pagada_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'RECORDATORIO_PAGO' THEN
            IF v_preferencias.recordatorio_pago_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.recordatorio_pago_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'RECORDATORIO_SEMANAL' THEN
            IF v_preferencias.recordatorio_semanal_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.recordatorio_semanal_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'REAGENDAMIENTO_DISPONIBLE' THEN
            IF v_preferencias.reagendamiento_disponible_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.reagendamiento_disponible_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'ULTIMO_DIA_REAGENDAMIENTO' THEN
            IF v_preferencias.ultimo_dia_reagendamiento_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.ultimo_dia_reagendamiento_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'RENOVACION_PROXIMA' THEN
            IF v_preferencias.renovacion_proxima_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.renovacion_proxima_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'AVISO_GENERAL' THEN
            IF v_preferencias.aviso_general_whatsapp THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'whatsapp');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;
            IF v_preferencias.aviso_general_email THEN
                INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
                v_enqueues_count := v_enqueues_count + 1;
            END IF;

        WHEN 'NUEVO_USUARIO_REGISTRADO' THEN
            INSERT INTO public.cola_envios (notificacion_id, canal) VALUES (v_notificacion_id, 'email');
            v_enqueues_count := v_enqueues_count + 1;

        ELSE
            -- No hacer nada si no se reconoce el tipo de mensaje
    END CASE;

    IF v_enqueues_count = 0 THEN
        RAISE NOTICE 'Ningún canal de notificación activo para el usuario % y tipo %. La notificación no será enviada.', p_usuario_id, p_tipo;
        DELETE FROM public.notificaciones WHERE id = v_notificacion_id;
        RETURN 0;
    END IF;

    RETURN v_notificacion_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al crear la notificación y su cola: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Comentario para documentación
COMMENT ON FUNCTION public.create_notification_and_queue IS
'Crea una notificación y la encola en los canales correspondientes según el tipo y preferencias del usuario.
Tipos soportados:
- BIENVENIDA_PRIMERA_RESERVA: Siempre email (código de acceso)
- ACCESO_SIN_RESERVA: Siempre email (infracción de acceso)
- FACTURA_NUEVA, FACTURA_PAGADA, RECORDATORIO_PAGO, RECORDATORIO_SEMANAL: Según preferencias
- REAGENDAMIENTO_DISPONIBLE, ULTIMO_DIA_REAGENDAMIENTO, RENOVACION_PROXIMA: Según preferencias
- AVISO_GENERAL: Según preferencias
- NUEVO_USUARIO_REGISTRADO: Siempre email (notificación admin)';
