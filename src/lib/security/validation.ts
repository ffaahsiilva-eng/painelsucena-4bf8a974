/**
 * Helpers de validação e sanitização para uso em formulários.
 * Use em conjunto com Zod para validar inputs antes de enviar à API.
 */
import { z } from "zod";

// Remove caracteres de controle e zero-width que podem ser usados para spoofing.
export const sanitizeString = (s: unknown): string => {
  if (typeof s !== "string") return "";
  return s
    // remove control chars exceto \n \r \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // remove zero-width chars
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
};

// Escapa HTML para uso quando precisar exibir texto bruto sem dangerouslySetInnerHTML.
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Schemas reutilizáveis
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "E-mail inválido" })
  .max(254, { message: "E-mail muito longo" });

export const passwordSchema = z
  .string()
  .min(8, { message: "Mínimo 8 caracteres" })
  .max(128, { message: "Máximo 128 caracteres" });

export const safeTextSchema = (max = 500) =>
  z
    .string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, { message: "Campo obrigatório" }).max(max));

export const optionalTextSchema = (max = 500) =>
  z
    .string()
    .transform(sanitizeString)
    .pipe(z.string().max(max))
    .optional();

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s+()-]{8,20}$/, { message: "Telefone inválido" });

export const uuidSchema = z.string().uuid({ message: "ID inválido" });

// URL segura: bloqueia javascript:, data:, file:, vbscript:
export const safeUrlSchema = z
  .string()
  .trim()
  .url({ message: "URL inválida" })
  .refine(
    (u) => /^https?:\/\//i.test(u),
    { message: "Apenas URLs http(s) são permitidas" }
  );

/**
 * Valida e retorna { ok, data, errors } sem lançar exceção.
 */
export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { ok: true; data: T } | { ok: false; errors: Record<string, string[]> } => {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error.flatten().fieldErrors as Record<string, string[]> };
};
