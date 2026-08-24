import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentMonthCampaigns } from "@/data/campaignData";

const CAMPAIGN_NOTIFICATION_KEY = "last_campaign_notification_month";
const CAMPAIGN_ANNOUNCEMENT_KEY = "last_campaign_announcement_month";

export const useCampaignNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkAndCreateNotification = async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const dayOfMonth = new Date().getDate();
      
      // Only notify in the first 5 days of the month
      if (dayOfMonth > 5) return;

      const notificationKey = `${currentYear}-${currentMonth}`;
      const lastNotified = localStorage.getItem(CAMPAIGN_NOTIFICATION_KEY);
      
      // Already notified this month
      if (lastNotified === notificationKey) return;

      const monthData = getCurrentMonthCampaigns();
      if (!monthData) return;

      const campaignNames = monthData.campaigns.map(c => c.name).join(", ");
      const campaignColors = monthData.campaigns.map(c => c.colorName).join(" e ");

      // Create notification in database
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        title: `🎗️ Campanhas de ${monthData.monthName}`,
        message: `Este mês celebramos: ${campaignNames}. As cores são ${campaignColors}. Clique para saber mais sobre cada campanha.`,
        type: "campaign",
        reference_type: "campaign",
        reference_id: notificationKey,
      });

      if (!error) {
        localStorage.setItem(CAMPAIGN_NOTIFICATION_KEY, notificationKey);
      }
    };

    const checkAndCreateAnnouncement = async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const dayOfMonth = new Date().getDate();

      // Only create announcement on the first 2 days of the month
      if (dayOfMonth > 2) return;

      const announcementKey = `${currentYear}-${currentMonth}`;
      const lastAnnounced = localStorage.getItem(CAMPAIGN_ANNOUNCEMENT_KEY);

      // Already announced this month
      if (lastAnnounced === announcementKey) return;

      const monthData = getCurrentMonthCampaigns();
      if (!monthData) return;

      // Check if announcement already exists for this month (created by system)
      const { data: existing } = await supabase
        .from("announcements")
        .select("id")
        .ilike("title", `%Campanhas de ${monthData.monthName}%`)
        .gte("created_at", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)
        .limit(1);

      if (existing && existing.length > 0) {
        localStorage.setItem(CAMPAIGN_ANNOUNCEMENT_KEY, announcementKey);
        return;
      }

      // Call edge function to generate banner and create announcement
      try {
        const { data, error } = await supabase.functions.invoke("generate-campaign-banner", {
          body: { monthData, userId: user.id },
        });

        if (error) {
          console.error("Error generating campaign announcement:", error);
          return;
        }

        localStorage.setItem(CAMPAIGN_ANNOUNCEMENT_KEY, announcementKey);
      } catch (err) {
        console.error("Failed to create campaign announcement:", err);
      }
    };

    checkAndCreateNotification();
    checkAndCreateAnnouncement();
  }, [user]);
};
