// Edge Function: process-access-logs
// Recibe un archivo Excel en base64, lo procesa y guarda los accesos en la base de datos.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import dayjs from "https://esm.sh/dayjs@1.11.10";
import isBetween from "https://esm.sh/dayjs@1.11.10/plugin/isBetween";
import minMax from "https://esm.sh/dayjs@1.11.10/plugin/minMax";
import utc from "https://esm.sh/dayjs@1.11.10/plugin/utc";
import customParseFormat from "https://esm.sh/dayjs@1.11.10/plugin/customParseFormat";

dayjs.extend(isBetween);
dayjs.extend(minMax);
dayjs.extend(utc);
dayjs.extend(customParseFormat);

// Argentina es UTC-3 (sin horario de verano desde 2009)
const ARGENTINA_UTC_OFFSET_HOURS = 3;

const ACCESS_TOLERANCE_MINUTES = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const AccessMatchStatus = {
  VALID: "valido",
  NO_RESERVATION: "sin_reserva",
  UNMATCHED: "sin_match",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validar API Key (opcional, pero recomendado si se llama desde fuera)
    // Se puede usar la misma key que para pagos o una nueva
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("IMPORT_API_KEY"); // Reusamos esta variable si existe, o crear una nueva

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Parsear body
    const { fileContent, fileName } = await req.json();

    if (!fileContent) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Missing fileContent (base64)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Decodificar Base64 a Uint8Array
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. Leer Excel
    const workbook = XLSX.read(bytes, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "El archivo Excel está vacío o no se pudo leer",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Normalizar datos del Excel (columnas en minúsculas)
    const accessRecords = jsonData
      .map((row: any) => {
        // Buscar columnas independientemente de mayúsculas/minúsculas
        const keys = Object.keys(row);
        const timeKey = keys.find((k) => k.toLowerCase().includes("time"));
        const userKey = keys.find(
          (k) =>
            k.toLowerCase().includes("user") ||
            k.toLowerCase().includes("usuario"),
        );
        const contentKey = keys.find((k) =>
          k.toLowerCase().includes("content"),
        );

        if (!timeKey || !userKey) return null;

        let timeVal = row[timeKey];

        // Parsear la fecha del Excel (que viene en hora local de Argentina)
        // y convertirla a UTC sumando el offset de Argentina (UTC-3 = +3 horas)
        let parsedTime = null;
        if (dayjs(timeVal).isValid()) {
          // La fecha del Excel está en hora Argentina (UTC-3)
          // Para convertir a UTC, sumamos 3 horas
          parsedTime = dayjs(timeVal)
            .add(ARGENTINA_UTC_OFFSET_HOURS, "hour")
            .toISOString();
        }

        return {
          time: parsedTime,
          user: row[userKey]?.toString().trim(),
          content: contentKey ? row[contentKey]?.toString() : "",
        };
      })
      .filter((r) => r !== null && r.time !== null && r.user);

    // 5. Inicializar Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 6. Cargar Reglas y Usuarios (Portado de accessControlService.js)
    const { data: rules } = await supabase
      .from("access_name_rules")
      .select("*");
    const rulesMap = new Map(
      (rules || []).map((r: any) => [
        r.access_name.toLowerCase().trim(),
        r.action,
      ]),
    );

    // Filtrar registros según reglas
    const recordsToProcess: any[] = [];
    const ignoredRecords: any[] = [];
    const trackedRecords: any[] = [];

    for (const record of accessRecords) {
      const normalizedName = record.user?.toLowerCase()?.trim();
      const ruleAction = rulesMap.get(normalizedName);

      if (ruleAction === "ignore") {
        ignoredRecords.push(record);
        continue;
      }

      if (ruleAction === "track") {
        trackedRecords.push({
          access_time: record.time,
          access_name: record.user,
          content: record.content,
          status: AccessMatchStatus.UNMATCHED,
          user_id: null,
          reservation_id: null,
          notified: false,
        });
        continue;
      }
      recordsToProcess.push(record);
    }

    // 7. Si hay registros para procesar, buscar usuarios y reservas
    let processedResults: any[] = [];

    if (recordsToProcess.length > 0) {
      // Rango de fechas
      const dates = recordsToProcess.map((r) => dayjs(r.time));
      const minDate = dayjs
        .min(dates)
        .subtract(ACCESS_TOLERANCE_MINUTES, "minute") // Margen extra
        .startOf("day");
      const maxDate = dayjs.max(dates).endOf("day");

      // Cargar usuarios
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, firstName, lastName, access_system_name");

      // Cargar reservas
      const { data: reservations } = await supabase
        .from("reservas_completas")
        .select("id, usuario_id, start_time, end_time, consultorio_nombre")
        .gte("start_time", minDate.toISOString())
        .lte("start_time", maxDate.toISOString())
        .in("estado", ["activa", "utilizada"]);

      // Función de matching de usuario
      const findUser = (accessName: string) => {
        if (!accessName || !users) return null;
        const norm = accessName.toLowerCase().trim();

        // 1. Exacto access_system_name
        const exact = users.find(
          (u) => u.access_system_name?.toLowerCase().trim() === norm,
        );
        if (exact) return exact;

        // 2. Nombre completo
        const fullName = users.find(
          (u) => `${u.firstName} ${u.lastName}`.toLowerCase().trim() === norm,
        );
        if (fullName) return fullName;

        // 3. Invertido
        const inverted = users.find(
          (u) => `${u.lastName} ${u.firstName}`.toLowerCase().trim() === norm,
        );
        if (inverted) return inverted;

        // 4. Parcial
        const partial = users.find(
          (u) =>
            u.firstName?.toLowerCase().trim() === norm ||
            u.lastName?.toLowerCase().trim() === norm,
        );
        if (partial) return partial;

        return null;
      };

      // Procesar
      recordsToProcess.forEach((record) => {
        const accessTime = dayjs(record.time);
        const user = findUser(record.user);

        if (!user) {
          processedResults.push({
            access_time: record.time,
            access_name: record.user,
            content: record.content,
            status: AccessMatchStatus.UNMATCHED,
            user_id: null,
            reservation_id: null,
            notified: false,
          });
          return;
        }

        // Buscar reserva válida
        const validRes = reservations?.find((res) => {
          if (res.usuario_id !== user.id) return false;
          const start = dayjs(res.start_time).subtract(
            ACCESS_TOLERANCE_MINUTES,
            "minute",
          );
          const end = dayjs(res.end_time);
          return accessTime.isBetween(start, end, null, "[)");
        });

        if (validRes) {
          processedResults.push({
            access_time: record.time,
            access_name: record.user,
            content: record.content,
            status: AccessMatchStatus.VALID,
            user_id: user.id,
            reservation_id: validRes.id,
            notified: false,
          });
        } else {
          processedResults.push({
            access_time: record.time,
            access_name: record.user,
            content: record.content,
            status: AccessMatchStatus.NO_RESERVATION,
            user_id: user.id,
            reservation_id: null,
            notified: false,
          });
        }
      });
    }

    // 8. Guardar todo en la base de datos
    const allLogs = [...processedResults, ...trackedRecords];

    if (allLogs.length > 0) {
      const { error } = await supabase.from("access_logs").upsert(allLogs, {
        onConflict: "access_time, access_name",
        ignoreDuplicates: true,
      });

      if (error) {
        throw error;
      }
    }

    // 9. Retornar estadísticas
    const stats = {
      total_processed: accessRecords.length,
      inserted: allLogs.length, // Ojo: upsert puede ignorar duplicados, esto es cant. intentada
      ignored: ignoredRecords.length,
      valid: processedResults.filter(
        (r) => r.status === AccessMatchStatus.VALID,
      ).length,
      no_reservation: processedResults.filter(
        (r) => r.status === AccessMatchStatus.NO_RESERVATION,
      ).length,
      unmatched: processedResults.filter(
        (r) => r.status === AccessMatchStatus.UNMATCHED,
      ).length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Procesados ${allLogs.length} registros.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing access logs:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
