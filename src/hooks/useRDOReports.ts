import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RDOReport {
  id: string;
  created_by: string;
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  jardinagem_location: string | null;
  jardinagem_activities: string | null;
  gabiao_location: string | null;
  gabiao_activities: string | null;
  difficulties: string | null;
  photo_urls: string[];
  report_text: string;
  efetivo_gabiao_text: string | null;
  efetivo_jardinagem_text: string | null;
  dds_text: string | null;
  temperature: number | null;
  apparent_temp: number | null;
  humidity: number | null;
  temperature_captured_at: string | null;
  planned_activities: { gabiao: string[]; jardinagem: string[] } | null;
  planned_gabiao_locked: boolean;
  planned_jardinagem_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface RDOReportInsert {
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  jardinagem_location?: string;
  jardinagem_activities?: string;
  gabiao_location?: string;
  gabiao_activities?: string;
  difficulties?: string;
  photo_urls?: string[];
  report_text: string;
  efetivo_gabiao_text?: string;
  efetivo_jardinagem_text?: string;
  dds_text?: string;
  temperature?: number | null;
  apparent_temp?: number | null;
  humidity?: number | null;
  temperature_captured_at?: string | null;
  planned_activities?: { gabiao: string[]; jardinagem: string[] } | null;
  planned_gabiao_locked?: boolean;
  planned_jardinagem_locked?: boolean;
}

const hasText = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim() !== "";

const hasItems = <T,>(value: T[] | null | undefined): value is T[] =>
  Array.isArray(value) && value.length > 0;

const mergeRDOReports = (reports: RDOReport[]): RDOReport | null => {
  if (!reports.length) return null;

  const sorted = [...reports].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const latest = sorted[0];

  const firstText = (
    values: Array<string | null | undefined>,
    fallback: string | null = null
  ) => values.find(hasText) ?? fallback;

  const firstArray = (values: Array<string[] | null | undefined>) =>
    values.find(hasItems) ?? latest.photo_urls ?? [];

  return {
    ...latest,
    weather_morning:
      firstText(sorted.map((report) => report.weather_morning), latest.weather_morning) ??
      latest.weather_morning,
    weather_afternoon:
      firstText(sorted.map((report) => report.weather_afternoon), latest.weather_afternoon) ??
      latest.weather_afternoon,
    jardinagem_location: firstText(
      sorted.map((report) => report.jardinagem_location),
      latest.jardinagem_location
    ),
    jardinagem_activities: firstText(
      sorted.map((report) => report.jardinagem_activities),
      latest.jardinagem_activities
    ),
    gabiao_location: firstText(
      sorted.map((report) => report.gabiao_location),
      latest.gabiao_location
    ),
    gabiao_activities: firstText(
      sorted.map((report) => report.gabiao_activities),
      latest.gabiao_activities
    ),
    difficulties: firstText(sorted.map((report) => report.difficulties), latest.difficulties),
    photo_urls: firstArray(sorted.map((report) => report.photo_urls)),
    report_text: firstText(sorted.map((report) => report.report_text), latest.report_text) ?? "",
    efetivo_gabiao_text: firstText(
      sorted.map((report) => report.efetivo_gabiao_text),
      latest.efetivo_gabiao_text
    ),
    efetivo_jardinagem_text: firstText(
      sorted.map((report) => report.efetivo_jardinagem_text),
      latest.efetivo_jardinagem_text
    ),
    dds_text: firstText(sorted.map((report) => report.dds_text), latest.dds_text),
    planned_activities: sorted.find((r) => r.planned_activities !== null)?.planned_activities ?? latest.planned_activities ?? null,
    planned_gabiao_locked: sorted.some((r) => r.planned_gabiao_locked) || latest.planned_gabiao_locked || false,
    planned_jardinagem_locked: sorted.some((r) => r.planned_jardinagem_locked) || latest.planned_jardinagem_locked || false,
    created_at: sorted[sorted.length - 1]?.created_at ?? latest.created_at,
  };
};

const mergeRDOReportsByDate = (reports: RDOReport[]) => {
  const groupedReports = reports.reduce<Record<string, RDOReport[]>>((acc, report) => {
    if (!acc[report.report_date]) {
      acc[report.report_date] = [];
    }
    acc[report.report_date].push(report);
    return acc;
  }, {});

  return Object.values(groupedReports)
    .map((group) => mergeRDOReports(group))
    .filter((report): report is RDOReport => report !== null)
    .sort((a, b) => b.report_date.localeCompare(a.report_date));
};

export const useRDOReports = (filterDate?: string) => {
  return useQuery({
    queryKey: ["rdo-reports", filterDate],
    queryFn: async () => {
      let query = supabase
        .from("rdo_reports")
        .select("id, report_date, weather_morning, weather_afternoon, jardinagem_location, jardinagem_activities, gabiao_location, gabiao_activities, difficulties, photo_urls, report_text, efetivo_gabiao_text, efetivo_jardinagem_text, dds_text, temperature, apparent_temp, humidity, temperature_captured_at, planned_activities, planned_gabiao_locked, planned_jardinagem_locked, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (filterDate) {
        query = query.eq("report_date", filterDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return mergeRDOReportsByDate((data as RDOReport[]) ?? []);
    },
  });
};

export const useRDOReport = (date: string) => {
  return useQuery({
    queryKey: ["rdo-report", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rdo_reports")
        .select("id, report_date, weather_morning, weather_afternoon, jardinagem_location, jardinagem_activities, gabiao_location, gabiao_activities, difficulties, photo_urls, report_text, efetivo_gabiao_text, efetivo_jardinagem_text, dds_text, temperature, apparent_temp, humidity, temperature_captured_at, planned_activities, planned_gabiao_locked, planned_jardinagem_locked, created_at, updated_at")
        .eq("report_date", date)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return mergeRDOReports((data as RDOReport[]) ?? []);
    },
    enabled: !!date,
  });
};

export const useSaveRDOReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: RDOReportInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: existingReports, error: existingError } = await supabase
        .from("rdo_reports")
        .select("id, report_date, weather_morning, weather_afternoon, jardinagem_location, jardinagem_activities, gabiao_location, gabiao_activities, difficulties, photo_urls, report_text, efetivo_gabiao_text, efetivo_jardinagem_text, dds_text, temperature, apparent_temp, humidity, temperature_captured_at, planned_activities, planned_gabiao_locked, planned_jardinagem_locked, created_at, updated_at")
        .eq("report_date", report.report_date)
        .order("updated_at", { ascending: false });

      if (existingError) throw existingError;

      const normalizedExistingReports = (existingReports as RDOReport[]) ?? [];
      const mergedExistingReport = mergeRDOReports(normalizedExistingReports);

      if (normalizedExistingReports.length > 0) {
        const primaryReport = normalizedExistingReports[0];
        const updateFields: Partial<RDOReportInsert> & { updated_at: string } = {
          ...report,
          updated_at: new Date().toISOString(),
        };

        if (report.efetivo_gabiao_text === undefined) {
          if (hasText(mergedExistingReport?.efetivo_gabiao_text)) {
            updateFields.efetivo_gabiao_text = mergedExistingReport.efetivo_gabiao_text;
          } else {
            delete updateFields.efetivo_gabiao_text;
          }
        }

        if (report.efetivo_jardinagem_text === undefined) {
          if (hasText(mergedExistingReport?.efetivo_jardinagem_text)) {
            updateFields.efetivo_jardinagem_text = mergedExistingReport.efetivo_jardinagem_text;
          } else {
            delete updateFields.efetivo_jardinagem_text;
          }
        }

        const { data, error } = await supabase
          .from("rdo_reports")
          .update(updateFields)
          .eq("id", primaryReport.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("rdo_reports")
        .insert({
          ...report,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });
};

export const useDeleteRDOReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rdo_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });
};

export const useSaveEfetivoToRDO = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      report_date: string;
      efetivo_gabiao_text?: string;
      efetivo_jardinagem_text?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: existingReports, error: existingError } = await supabase
        .from("rdo_reports")
        .select("id, report_date, weather_morning, weather_afternoon, jardinagem_location, jardinagem_activities, gabiao_location, gabiao_activities, difficulties, photo_urls, report_text, efetivo_gabiao_text, efetivo_jardinagem_text, dds_text, temperature, apparent_temp, humidity, temperature_captured_at, planned_activities, planned_gabiao_locked, planned_jardinagem_locked, created_at, updated_at")
        .eq("report_date", data.report_date)
        .order("updated_at", { ascending: false });

      if (existingError) throw existingError;

      const normalizedExistingReports = (existingReports as RDOReport[]) ?? [];
      const mergedExistingReport = mergeRDOReports(normalizedExistingReports);

      if (normalizedExistingReports.length > 0) {
        const primaryReport = normalizedExistingReports[0];
        const updateFields: {
          updated_at: string;
          efetivo_gabiao_text?: string | null;
          efetivo_jardinagem_text?: string | null;
        } = {
          updated_at: new Date().toISOString(),
        };

        if (hasText(data.efetivo_gabiao_text)) {
          updateFields.efetivo_gabiao_text = data.efetivo_gabiao_text;
        } else if (hasText(mergedExistingReport?.efetivo_gabiao_text)) {
          updateFields.efetivo_gabiao_text = mergedExistingReport.efetivo_gabiao_text;
        }

        if (hasText(data.efetivo_jardinagem_text)) {
          updateFields.efetivo_jardinagem_text = data.efetivo_jardinagem_text;
        } else if (hasText(mergedExistingReport?.efetivo_jardinagem_text)) {
          updateFields.efetivo_jardinagem_text = mergedExistingReport.efetivo_jardinagem_text;
        }

        const { data: updated, error } = await supabase
          .from("rdo_reports")
          .update(updateFields)
          .eq("id", primaryReport.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      }

      const { data: created, error } = await supabase
        .from("rdo_reports")
        .insert({
          report_date: data.report_date,
          created_by: user.id,
          weather_morning: "sol",
          weather_afternoon: "sol",
          report_text: "",
          efetivo_gabiao_text: hasText(data.efetivo_gabiao_text)
            ? data.efetivo_gabiao_text
            : null,
          efetivo_jardinagem_text: hasText(data.efetivo_jardinagem_text)
            ? data.efetivo_jardinagem_text
            : null,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });
};

export const useUploadRDOPhotos = () => {
  const { user } = useAuth();

  return async (files: File[]): Promise<string[]> => {
    if (!user?.id) throw new Error("User not authenticated");

    const urls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("rdo-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("rdo-photos")
        .getPublicUrl(fileName);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };
};
