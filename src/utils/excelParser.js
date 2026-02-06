import * as XLSX from "xlsx";

/**
 * Parsea un archivo Excel y extrae los registros de acceso
 * @param {File} file - Archivo Excel subido
 * @returns {Promise<Array>} Array de registros {time, user, content}
 */
export const parseAccessExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          dateNF: "YYYY-MM-DD HH:mm:ss",
        });

        // Validar y mapear columnas esperadas
        const records = jsonData
          .filter((row) => row.time && row.user) // Filtrar filas vacías o sin usuario
          .map((row) => ({
            time: row.time,
            user: row.user?.trim(),
            content: row.content || "",
            unlockRecord: row["unlock record"] || row.unlockRecord || "",
          }));

        if (records.length === 0) {
          reject(
            new Error(
              "El archivo no contiene registros válidos. Verifica que tenga columnas 'time' y 'user'."
            )
          );
          return;
        }

        resolve(records);
      } catch (error) {
        reject(new Error(`Error al procesar el archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Valida que el archivo sea un Excel válido
 * @param {File} file - Archivo a validar
 * @returns {Object} {valid: boolean, error?: string}
 */
export const validateExcelFile = (file) => {
  if (!file) {
    return { valid: false, error: "No se seleccionó ningún archivo" };
  }

  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  const validExtensions = [".xlsx", ".xls"];
  const fileExtension = file.name
    .toLowerCase()
    .slice(file.name.lastIndexOf("."));

  if (
    !validTypes.includes(file.type) &&
    !validExtensions.includes(fileExtension)
  ) {
    return { valid: false, error: "El archivo debe ser un Excel (.xlsx o .xls)" };
  }

  // Límite de 10MB
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "El archivo no debe superar los 10MB" };
  }

  return { valid: true };
};
