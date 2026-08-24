import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ribbon, Heart, Calendar } from "lucide-react";
import { campaignData, MonthCampaign } from "@/data/campaignData";
import { useIsAdmin } from "@/hooks/useUserRole";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";
import { EditModeToggle } from "@/components/cms/EditModeToggle";

const CAMPAIGN_BANNERS: Record<number, string> = {
  2: "/campaigns/campanha-2.png",
  3: "/campaigns/campanha-3.png",
  4: "/campaigns/campanha-4.png",
  5: "/campaigns/campanha-5.png",
  6: "/campaigns/campanha-6.png",
  7: "/campaigns/campanha-7.png",
  8: "/campaigns/campanha-8.png",
  9: "/campaigns/campanha-9.png",
  10: "/campaigns/campanha-10.png",
  11: "/campaigns/campanha-11.png",
  12: "/campaigns/campanha-12.png",
};

const Campanhas = () => {
  const currentMonth = new Date().getMonth() + 1;
  const { isAdmin, isModerator } = useIsAdmin();
  const canEdit = isAdmin || isModerator;
  const [editMode, setEditMode] = useState(false);

  const MonthCard = ({ monthData }: { monthData: MonthCampaign }) => {
    const isCurrentMonth = monthData.month === currentMonth;
    const bannerSrc = CAMPAIGN_BANNERS[monthData.month];

    return (
      <Card
        className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
          isCurrentMonth ? "ring-2 ring-primary shadow-lg" : ""
        }`}
      >
        {isCurrentMonth && (
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg z-10">
            Mês Atual
          </div>
        )}

        {bannerSrc ? (
          editMode ? (
            <EditableImage
              pageKey="campanhas"
              elementKey={`banner-month-${monthData.month}`}
              defaultSrc={bannerSrc}
              alt={`Banner ${monthData.monthName}`}
              canEdit={editMode}
              imgClassName="w-full object-cover"
            />
          ) : (
            <img loading="lazy" decoding="async"
              src={bannerSrc}
              alt={`Banner ${monthData.monthName}`}
              className="w-full object-cover"
            />
          )
        ) : (
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${monthData.campaigns[0]?.color}20` }}
              >
                <Ribbon className="h-8 w-8" style={{ color: monthData.campaigns[0]?.color }} />
              </div>
              <div>
                <CardTitle className="text-xl">{monthData.monthName}</CardTitle>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {monthData.campaigns.map((campaign, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs font-normal"
                      style={{
                        backgroundColor: `${campaign.color}20`,
                        color: campaign.color,
                        borderColor: campaign.color,
                      }}
                    >
                      {campaign.colorName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className="space-y-3 pt-4">
          <EditableText
            pageKey="campanhas"
            elementKey={`month-title-${monthData.month}`}
            defaultValue={monthData.monthName}
            className="text-lg font-semibold"
            as="h3"
            canEdit={editMode}
          />
          {monthData.campaigns.map((campaign, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border-l-4"
              style={{
                borderLeftColor: campaign.color,
                backgroundColor: `${campaign.color}08`,
              }}
            >
              <EditableText
                pageKey="campanhas"
                elementKey={`campaign-name-${monthData.month}-${idx}`}
                defaultValue={campaign.name}
                className="font-semibold text-sm mb-1"
                as="h4"
                canEdit={editMode}
              />
              <EditableText
                pageKey="campanhas"
                elementKey={`campaign-desc-${monthData.month}-${idx}`}
                defaultValue={campaign.description}
                className="text-sm text-muted-foreground"
                as="p"
                canEdit={editMode}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold">
                  <EditableText
                    pageKey="campanhas"
                    elementKey="page-title"
                    defaultValue="Campanhas de"
                    canEdit={editMode}
                    as="span"
                  />{" "}
                  <span className="text-gradient">
                    <EditableText
                      pageKey="campanhas"
                      elementKey="page-title-highlight"
                      defaultValue="Conscientização"
                      canEdit={editMode}
                      as="span"
                    />
                  </span>
                </h1>
                <EditableText
                  pageKey="campanhas"
                  elementKey="page-subtitle"
                  defaultValue="Cores e causas que importam durante todo o ano"
                  className="text-xs sm:text-sm text-muted-foreground mt-1"
                  as="p"
                  canEdit={editMode}
                />
              </div>
            </div>
            {canEdit && (
              <EditModeToggle isEditMode={editMode} onToggle={() => setEditMode(!editMode)} />
            )}
          </div>

          <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-none mt-4 sm:mt-6">
            <CardContent className="py-3 sm:py-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                <EditableText
                  pageKey="campanhas"
                  elementKey="info-text"
                  defaultValue="Durante o ano, diversas campanhas de conscientização utilizam cores específicas para alertar sobre doenças, estimular a prevenção e promover o cuidado com a saúde. Conheça todas as causas, mês a mês."
                  className="text-xs sm:text-sm text-muted-foreground"
                  as="p"
                  canEdit={editMode}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {campaignData.map((monthData, index) => (
            <div
              key={monthData.month}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <MonthCard monthData={monthData} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Campanhas;
